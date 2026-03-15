import { NextRequest } from "next/server";

export const runtime = "nodejs";
import Anthropic from "@anthropic-ai/sdk";
import { triggerSandbox } from "@/lib/sandbox";
import { detectMode, buildSystemPrompt } from "@/lib/chatUtils";
import type { ChatMessage, IntentMode, SandboxResult, UserRole, AIMode } from "@/types/chat";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Tool definitions ───────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "generate_chart",
    description: "Render a chart in the user's chat panel. Call this with real data from the analysis. The chart will appear automatically.",
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
    description: "Run data analysis on food pantry data. Use for any question about pantries, locations, trends, visits, patterns, or statistics. This is the primary tool for all queries.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "The question to answer" },
        mode: {
          type: "number",
          description: "1=specific data query, 2=vague exploration or trends, 3=causal or why question, 4=feedback or suggestion",
        },
      },
      required: ["query", "mode"],
    },
  },
];

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
        send("mode", JSON.stringify(aiMode));

        for (const chart of pendingCharts) {
          send("chart", JSON.stringify(chart));
        }
        for (const map of pendingMaps) {
          send("map", JSON.stringify(map));
        }

        if (analysisResult) {
          send("analysis", JSON.stringify({
            mode: analysisResult.mode,
            sandboxResult: analysisResult.result,
          }));
          send("done", "");
          return;
        }

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
