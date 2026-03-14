import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { triggerSandbox } from "@/lib/sandbox";
import {
  getResourcesByZip,
  searchResources,
  getResourcesOpenToday,
} from "@/lib/lemontree_api";
import type { ChatMessage, IntentMode, SandboxResult } from "@/types/chat";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a helpful assistant for Lemon Tree Insights, a data analysis tool for food pantry networks.
You help users understand visit patterns, food access trends, and pantry operations.
Be concise and direct. Use the tools available to you to answer questions about pantries and data.
Do not fabricate data — only use what the tools return.`;

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

async function callTool(name: string, input: Record<string, any>): Promise<string> {
  try {
    switch (name) {
      case "search_pantries": {
        const data = await searchResources(input.query as string, { take: 5 });
        return formatResources(data.resources ?? []);
      }
      case "get_pantries_by_zip": {
        const data = await getResourcesByZip(input.zip as string, { take: 5, sort: "distance" });
        return `Pantries near ${input.zip}:\n\n${formatResources(data.resources ?? [])}`;
      }
      case "get_open_pantries": {
        const data = await getResourcesOpenToday({ take: 5 });
        return `Pantries open today:\n\n${formatResources(data.resources ?? [])}`;
      }
      default:
        return "Tool not available.";
    }
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : "Tool call failed"}`;
  }
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { message, history } = (await req.json()) as {
    message: string;
    history: ChatMessage[];
  };

  let messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  let analysisResult: { mode: IntentMode; result: SandboxResult } | null = null;

  // ── Agentic loop — Claude calls tools until it has everything it needs ─────
  for (let round = 0; round < 5; round++) {
    let response: Anthropic.Message;
    try {
      response = await anthropic.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Claude API call failed.";
      return NextResponse.json({ type: "conversation_error", error: errorMsg }, { status: 502 });
    }

    if (response.stop_reason !== "tool_use") break;

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      const input = toolUse.input as Record<string, any>;

      if (toolUse.name === "run_analysis") {
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

  // ── Analysis result — return as JSON so the AnalysisCard renders ──────────
  if (analysisResult) {
    return NextResponse.json({
      type: "analysis",
      mode: analysisResult.mode,
      sandboxResult: analysisResult.result,
    });
  }

  // ── Stream Claude's final response ────────────────────────────────────────
  try {
    const stream = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      stream: true,
      system: SYSTEM_PROMPT,
      messages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Claude API call failed.";
    return NextResponse.json({ type: "conversation_error", error: errorMsg }, { status: 502 });
  }
}
