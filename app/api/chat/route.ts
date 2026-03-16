import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { detectIntent } from "@/lib/intentDetection";
import { triggerSandbox } from "@/lib/sandbox";
import {
  getResourcesByZip,
  searchResources,
  getResourcesOpenToday,
} from "@/lib/lemontree_api";
import { createSession, saveMessage } from "@/lib/db";
import type { UserRole, IntentMode } from "@/types/chat";

export const runtime = "nodejs";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are LemonAId, an AI assistant for Lemon Tree Insights — a data analysis platform for food pantry networks.
You help users understand visit patterns, food access trends, and pantry operations.
Be concise and direct. When a user's question requires data analysis, let them know the analysis is running.
Do not fabricate data — only comment on what the user tells you or what the analysis returns.`;

// ── SSE helper ────────────────────────────────────────────────────────────────

function sse(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// ── Lookup helpers ────────────────────────────────────────────────────────────

function extractZip(message: string): string | null {
  const match = message.match(/\b(\d{5})\b/);
  return match ? match[1] : null;
}

function extractLocation(message: string): string | null {
  const match = message.match(
    /\b(?:near|in|around|close to|by|to)\s+([A-Za-z][A-Za-z\s,]{2,30}?)(?:\?|$|,|\.|!)/i
  );
  return match ? match[1].trim() : null;
}

function isOpenQuery(message: string): boolean {
  return /\bopen (now|today|tonight|this week)\b/i.test(message);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatResources(resources: any[]): string {
  if (!resources.length) return "No pantries found for that location.";
  return resources
    .slice(0, 5)
    .map((r, i) => {
      const address = [r.addressStreet1, r.city, r.state, r.zipCode]
        .filter(Boolean)
        .join(", ");
      const type = r.resourceType?.name ?? "Food Resource";
      const accepting = r.acceptingNewClients ? "Yes" : "No";
      const appt = r.openByAppointment ? "Yes" : "No";
      const site = r.website ?? "N/A";
      return `${i + 1}. ${r.name} (${type})\n   Address: ${address || "Not listed"}\n   Accepting new clients: ${accepting} | Appointment needed: ${appt}\n   Website: ${site}`;
    })
    .join("\n\n");
}

async function fetchLookupContext(message: string): Promise<string> {
  const zip = extractZip(message);
  if (isOpenQuery(message)) {
    const data = await getResourcesOpenToday({ take: 5 });
    return `Pantries open today:\n\n${formatResources(data.resources ?? [])}`;
  }
  if (zip) {
    const data = await getResourcesByZip(zip, { take: 5, sort: "distance" });
    return `Pantries near ${zip}:\n\n${formatResources(data.resources ?? [])}`;
  }
  const location = extractLocation(message);
  if (location) {
    const data = await searchResources(location, { take: 5 });
    return `Pantries matching "${location}":\n\n${formatResources(data.resources ?? [])}`;
  }
  const data = await searchResources(message, { take: 5 });
  return `Pantries found:\n\n${formatResources(data.resources ?? [])}`;
}

// Map IntentMode (1-4) to the AIMode strings the frontend understands
const MODE_MAP: Record<IntentMode, string> = {
  1: "query",
  2: "exploration",
  3: "investigation",
  4: "query",
};

// ── Persistence helpers ────────────────────────────────────────────────────────

async function ensureSession(
  sessionId: string | null | undefined,
  userId: string | null | undefined,
  firstMessage: string
): Promise<string | null> {
  if (sessionId) return sessionId;
  if (!userId) return null;
  try {
    const session = await createSession(userId, firstMessage.slice(0, 60));
    return session.id as string;
  } catch {
    return null;
  }
}

async function persistMessages(
  sid: string | null,
  userMsgId: string,
  userContent: string,
  assistantContent: string,
  extras?: { isAnalysis?: boolean; mode?: IntentMode }
) {
  if (!sid) return;
  await saveMessage(sid, { id: userMsgId, role: "user", content: userContent }).catch(() => {});
  await saveMessage(sid, {
    id: crypto.randomUUID(),
    role: "assistant",
    content: assistantContent,
    isAnalysis: extras?.isAnalysis,
    mode: extras?.mode ?? null,
  }).catch(() => {});
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { messages, role, sessionId, userId } = (await req.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
    role?: UserRole;
    sessionId?: string | null;
    userId?: string | null;
  };

  // Extract the latest user message and prior history
  const message = messages[messages.length - 1]?.content ?? "";
  const history = messages.slice(0, -1);
  const userMsgId = crypto.randomUUID();
  const sid = await ensureSession(sessionId, userId, message);

  void role;

  const intent = detectIntent(message);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(sse(data)));

      try {
        // ── Analysis path ──────────────────────────────────────────────────
        if (intent.kind === "analysis") {
          send({ type: "mode", mode: MODE_MAP[intent.mode] });
          send({ type: "text", content: "Running analysis…\n\n" });

          // Keep SSE connection alive with comment pings while analysis runs
          const heartbeat = setInterval(() => {
            try { controller.enqueue(encoder.encode(": ping\n\n")); } catch { /* stream closed */ }
          }, 10000);

          let result;
          try {
            const timeout = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Analysis timed out. The sandbox took too long to respond. Try a more specific question.")), 90000)
            );
            result = await Promise.race([
              triggerSandbox({ query: message, mode: intent.mode }),
              timeout,
            ]);
          } finally {
            clearInterval(heartbeat);
          }

          await persistMessages(sid, userMsgId, message, result.summary, { isAnalysis: true, mode: intent.mode });
          send({ type: "text", content: result.summary });

          if (result.chartData) {
            send({
              type: "chart",
              spec: {
                type: result.chartData.type,
                title: result.chartData.title,
                data: result.chartData.data,
                xKey: result.chartData.xKey ?? "x",
                yKey: result.chartData.yKey ?? "y",
              },
            });
          }

          if (result.images && result.images.length > 0) {
            send({ type: "images", images: result.images });
          }

          send({ type: "done" });
          controller.close();
          return;
        }

        // ── Lookup path ────────────────────────────────────────────────────
        if (intent.kind === "lookup") {
          send({ type: "mode", mode: "query" });

          const lookupContext = await fetchLookupContext(message);
          const groundedSystem = `${SYSTEM_PROMPT}\n\nThe following pantry data was retrieved live from the Lemon Tree network. Use it to answer the user. Do not add pantries that aren't listed here.\n\n${lookupContext}`;

          const response = await client.messages.create({
            model: "claude-opus-4-6",
            max_tokens: 1024,
            system: groundedSystem,
            messages: [{ role: "user", content: message }],
          });

          const text =
            response.content[0].type === "text"
              ? response.content[0].text
              : "";
          await persistMessages(sid, userMsgId, message, text);
          send({ type: "text", content: text });
          send({ type: "done" });
          controller.close();
          return;
        }

        // ── Conversation path ──────────────────────────────────────────────
        const response = await client.messages.create({
          model: "claude-opus-4-6",
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [
            ...history.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: message },
          ],
        });

        const text =
          response.content[0].type === "text" ? response.content[0].text : "";
        await persistMessages(sid, userMsgId, message, text);
        send({ type: "text", content: text });
        send({ type: "done" });
        controller.close();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Something went wrong.";
        send({ type: "error", message: msg });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
