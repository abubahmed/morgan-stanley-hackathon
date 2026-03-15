import { NextRequest } from "next/server";

export const runtime = "nodejs";
import Anthropic from "@anthropic-ai/sdk";
import { triggerSandbox } from "@/lib/sandbox";
import { detectMode, buildSystemPrompt } from "@/lib/chatUtils";
import {
  getResourcesByZip,
  searchResources,
  getResourcesOpenToday,
} from "@/lib/lemontree_api";
import type { ChatMessage, IntentMode, SandboxResult, UserRole, AIMode } from "@/types/chat";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Tool definitions ───────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_pantries",
    description: "Search for food pantries by location name, city, or neighborhood. Use this for any question about finding or locating pantries.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Location name, city, or search query" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_pantries_by_zip",
    description: "Find the closest food pantries to a specific zip code.",
    input_schema: {
      type: "object" as const,
      properties: {
        zip: { type: "string", description: "5-digit US zip code" },
      },
      required: ["zip"],
    },
  },
  {
    name: "get_open_pantries",
    description: "Get food pantries that are open and available today.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "generate_chart",
    description: "Render a chart in the user's chat panel. Call this with real data you have fetched. The chart will appear automatically.",
    input_schema: {
      type: "object" as const,
      required: ["type", "title", "data", "xKey", "yKey"],
      properties: {
        type: { type: "string", enum: ["bar", "line", "pie"], description: "Chart type" },
        title: { type: "string", description: "Chart title" },
        data: {
          type: "array",
          description: "Array of data objects",
          items: { type: "object" },
        },
        xKey: { type: "string", description: "Key for X axis / labels" },
        yKey: { type: "string", description: "Key for Y axis / values" },
        color: { type: "string", description: "Hex color for chart (default green)" },
      },
    },
  },
  {
    name: "render_map",
    description: "Render an interactive map showing pantry locations. Use this when the user asks about locations geographically.",
    input_schema: {
      type: "object" as const,
      required: ["title", "markers"],
      properties: {
        title: { type: "string", description: "Map title" },
        markers: {
          type: "array",
          description: "Array of map markers",
          items: {
            type: "object",
            required: ["lat", "lng", "label"],
            properties: {
              lat: { type: "number" },
              lng: { type: "number" },
              label: { type: "string" },
              color: { type: "string" },
            },
          },
        },
      },
    },
  },
  {
    name: "run_analysis",
    description: "Run data analysis on food pantry visit patterns, trends, or statistics. Use for questions about data, counts, trends, comparisons, or anything that requires crunching numbers.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "The analysis question" },
        mode: {
          type: "number",
          description: "1=specific data query, 2=vague exploration or trends, 3=causal or why question, 4=feedback or suggestion",
        },
      },
      required: ["query", "mode"],
    },
  },
];

// ── Tool executor ──────────────────────────────────────────────────────────────

function formatResources(resources: any[]): string {
  if (!resources.length) return "No pantries found for that location.";
  return resources
    .slice(0, 8)
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

async function callTool(name: string, input: Record<string, any>): Promise<string> {
  try {
    switch (name) {
      case "search_pantries": {
        const data = await searchResources(input.query as string, { take: 8 });
        return formatResources(data.resources ?? []);
      }
      case "get_pantries_by_zip": {
        const data = await getResourcesByZip(input.zip as string, { take: 8, sort: "distance" });
        return `Pantries near ${input.zip}:\n\n${formatResources(data.resources ?? [])}`;
      }
      case "get_open_pantries": {
        const data = await getResourcesOpenToday({ take: 8 });
        return `Pantries open today:\n\n${formatResources(data.resources ?? [])}`;
      }
      default:
        return "Tool not available.";
    }
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : "Tool call failed"}`;
  }
}

// ── SSE helpers ────────────────────────────────────────────────────────────────

function sseEvent(event: string, data: string): string {
  return `event: ${event}\ndata: ${data}\n\n`;
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { message, history, role = "community" } = (await req.json()) as {
    message: string;
    history: ChatMessage[];
    role?: UserRole;
  };

  const aiMode: AIMode = detectMode(message);
  const systemPrompt = buildSystemPrompt(aiMode, role);

  let messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  let analysisResult: { mode: IntentMode; result: SandboxResult } | null = null;

  // Pending chart/map specs to stream to client
  const pendingCharts: any[] = [];
  const pendingMaps: any[] = [];

  // ── Agentic loop ──────────────────────────────────────────────────────────
  for (let round = 0; round < 5; round++) {
    let response: Anthropic.Message;
    try {
      response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        tools: TOOLS,
        messages,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Claude API call failed.";
      const encoder = new TextEncoder();
      return new Response(
        encoder.encode(sseEvent("error", errorMsg) + sseEvent("done", "")),
        { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } }
      );
    }

    if (response.stop_reason !== "tool_use") break;

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      const input = toolUse.input as Record<string, any>;

      if (toolUse.name === "generate_chart") {
        pendingCharts.push(input);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: "Chart rendered successfully.",
        });
      } else if (toolUse.name === "render_map") {
        pendingMaps.push(input);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: "Map rendered successfully.",
        });
      } else if (toolUse.name === "run_analysis") {
        try {
          const mode = (input.mode as IntentMode) ?? 1;
          const result = await triggerSandbox({ query: input.query as string, mode });
          analysisResult = { mode, result };
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: `Analysis complete. Summary: ${result.summary}`,
          });
        } catch (err) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: `Analysis failed: ${err instanceof Error ? err.message : "Unknown error"}`,
          });
        }
      } else {
        const content = await callTool(toolUse.name, input);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content,
        });
      }
    }

    messages = [
      ...messages,
      { role: "assistant" as const, content: response.content },
      { role: "user" as const, content: toolResults },
    ];
  }

  // ── Stream SSE response ────────────────────────────────────────────────────
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: string) => {
        controller.enqueue(encoder.encode(sseEvent(event, data)));
      };

      try {
        // Always send the AI mode so the client can display it
        send("mode", JSON.stringify(aiMode));

        // Send any charts/maps that were generated
        for (const chart of pendingCharts) {
          send("chart", JSON.stringify(chart));
        }
        for (const map of pendingMaps) {
          send("map", JSON.stringify(map));
        }

        // Analysis result — send as a single event then close
        if (analysisResult) {
          send("analysis", JSON.stringify({
            mode: analysisResult.mode,
            sandboxResult: analysisResult.result,
          }));
          send("done", "");
          return;
        }

        // Stream Claude's final text response chunk by chunk
        const stream = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          stream: true,
          system: systemPrompt,
          messages,
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            send("text", JSON.stringify(event.delta.text));
          }
        }

        send("done", "");
      } catch (err) {
        send("error", err instanceof Error ? err.message : "Claude API call failed.");
        send("done", "");
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
