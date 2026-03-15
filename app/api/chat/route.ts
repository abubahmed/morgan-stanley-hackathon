import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { detectIntent } from "@/lib/intentDetection";
import { triggerSandbox } from "@/lib/sandbox";
import {
  getResourcesByZip,
  searchResources,
  getResourcesOpenToday,
} from "@/lib/lemontree_api";
import { createSession, saveMessage } from "@/lib/db";
import type { ChatMessage } from "@/types/chat";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a helpful assistant for Lemon Tree Insights, a data analysis tool for food pantry networks.
You help users understand visit patterns, food access trends, and pantry operations.
Be concise and direct. When a user's question requires data analysis, let them know the analysis is running.
Do not fabricate data — only comment on what the user tells you or what the analysis returns.`;

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
      return `${i + 1}. ${r.name} (${type})
   Address: ${address || "Not listed"}
   Accepting new clients: ${accepting} | Appointment needed: ${appt}
   Website: ${site}`;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  } catch (e) {
    console.error("Failed to create session:", e);
    return null;
  }
}

async function persistMessages(
  sid: string | null,
  userMsgId: string,
  userContent: string,
  assistantContent: string,
  extras?: { isAnalysis?: boolean; mode?: number; sandboxResult?: unknown }
) {
  if (!sid) return;
  // Save user message
  await saveMessage(sid, {
    id: userMsgId,
    role: "user",
    content: userContent,
  }).catch((e) => console.error("DB save user msg:", e));
  // Save assistant message
  await saveMessage(sid, {
    id: crypto.randomUUID(),
    role: "assistant",
    content: assistantContent,
    isAnalysis: extras?.isAnalysis,
    mode: extras?.mode as any,
    sandboxResult: extras?.sandboxResult as any,
  }).catch((e) => console.error("DB save assistant msg:", e));
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const {
    message,
    history,
    sessionId: incomingSessionId,
    userId,
  } = (await req.json()) as {
    message: string;
    history: ChatMessage[];
    sessionId?: string | null;
    userId?: string | null;
  };

  const userMsgId = crypto.randomUUID();
  const sid = await ensureSession(incomingSessionId, userId, message);
  const intent = detectIntent(message);

  // ── Analysis path ────────────────────────────────────────────────────────
  if (intent.kind === "analysis") {
    try {
      const result = await triggerSandbox({ query: message, mode: intent.mode });

      await persistMessages(sid, userMsgId, message, result.summary, {
        isAnalysis: true,
        mode: intent.mode,
        sandboxResult: result,
      });

      return NextResponse.json({
        type: "analysis",
        mode: intent.mode,
        sandboxResult: result,
        sessionId: sid,
      });
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Sandbox call failed.";
      return NextResponse.json(
        { type: "analysis_error", error: errorMsg },
        { status: 502 }
      );
    }
  }

  // ── Lookup path ──────────────────────────────────────────────────────────
  if (intent.kind === "lookup") {
    let lookupContext: string;
    try {
      lookupContext = await fetchLookupContext(message);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Lemon Tree API call failed.";
      return NextResponse.json(
        { type: "conversation_error", error: errorMsg },
        { status: 502 }
      );
    }

    const groundedSystem = `${SYSTEM_PROMPT}

The following pantry data was retrieved live from the Lemon Tree network for this query. Use it to answer the user. Do not add pantries that aren't listed here.

${lookupContext}`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 1024,
        system: groundedSystem,
        messages: [{ role: "user", content: message }],
      });
      const text =
        response.content[0].type === "text" ? response.content[0].text : "";

      await persistMessages(sid, userMsgId, message, text);

      return NextResponse.json({
        type: "conversation",
        content: text,
        sessionId: sid,
      });
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Claude API call failed.";
      return NextResponse.json(
        { type: "conversation_error", error: errorMsg },
        { status: 502 }
      );
    }
  }

  // ── Conversational path ──────────────────────────────────────────────────
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });
    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    await persistMessages(sid, userMsgId, message, text);

    return NextResponse.json({
      type: "conversation",
      content: text,
      sessionId: sid,
    });
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Claude API call failed.";
    return NextResponse.json(
      { type: "conversation_error", error: errorMsg },
      { status: 502 }
    );
  }
}
