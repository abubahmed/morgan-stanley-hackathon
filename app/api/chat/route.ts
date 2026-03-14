import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getResources, searchResources, getResourcesByZip } from "@/lib/lemontree_api";
import { detectMode, buildSystemPrompt } from "@/lib/chatUtils";
import type { UserRole } from "@/types/chat";

export const runtime = "nodejs";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_resources",
    description:
      "Search food resources from the Lemontree Food Helpline database. Use this to get real data about food pantries, soup kitchens, and SNAP resources.",
    input_schema: {
      type: "object" as const,
      properties: {
        text: { type: "string", description: "Text search query (e.g. 'food bank', 'soup kitchen')" },
        zipCode: { type: "string", description: "Filter by zip code" },
        region: { type: "string", description: "Filter by region ID (e.g. 'NEW_YORK_CITY', 'BROOKLYN')" },
        resourceTypeId: {
          type: "string",
          enum: ["FOOD_PANTRY", "SOUP_KITCHEN", "SNAP_EBT"],
          description: "Filter by resource type",
        },
        take: { type: "number", description: "Number of results to return (default 10, max 40)" },
      },
    },
  },
  {
    name: "generate_chart",
    description:
      "Render a chart in the user's visualization panel. Call this with data you've fetched to create a visual. The chart will appear automatically in the side panel.",
    input_schema: {
      type: "object" as const,
      required: ["type", "title", "data", "xKey", "yKey"],
      properties: {
        type: { type: "string", enum: ["bar", "line", "pie"], description: "Chart type" },
        title: { type: "string", description: "Chart title displayed above the visualization" },
        data: {
          type: "array",
          description: "Array of data objects",
          items: { type: "object" },
        },
        xKey: { type: "string", description: "Key in data objects for the X axis" },
        yKey: { type: "string", description: "Key in data objects for the Y axis / value" },
        color: { type: "string", description: "Hex color for the chart (default green)" },
      },
    },
  },
  {
    name: "render_map",
    description:
      "Render an interactive map in the visualization panel showing locations with pin markers. Use this to display resources geographically.",
    input_schema: {
      type: "object" as const,
      required: ["title", "markers"],
      properties: {
        title: { type: "string", description: "Map title" },
        markers: {
          type: "array",
          description: "Array of map markers to display",
          items: {
            type: "object",
            required: ["lat", "lng", "label"],
            properties: {
              lat: { type: "number", description: "Latitude" },
              lng: { type: "number", description: "Longitude" },
              label: { type: "string", description: "Marker label" },
              color: { type: "string", description: "Marker color (hex or named)" },
            },
          },
        },
      },
    },
  },
  {
    name: "run_analysis",
    description:
      "Run Python code analysis on food resource data for complex statistical or geographic queries. Use this for questions requiring data computation, aggregation, or analysis that can't be answered from search alone.",
    input_schema: {
      type: "object" as const,
      required: ["job"],
      properties: {
        job: { type: "string", description: "A clear description of the analysis to perform" },
      },
    },
  },
];

async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  if (name === "search_resources") {
    const { text, zipCode, region, resourceTypeId, take = 10 } = input as {
      text?: string;
      zipCode?: string;
      region?: string;
      resourceTypeId?: string;
      take?: number;
    };

    let result;
    if (text) {
      result = await searchResources(text, { take });
    } else if (zipCode) {
      result = await getResourcesByZip(zipCode as string, { take });
    } else {
      result = await getResources({ region, resourceTypeId, take } as Parameters<typeof getResources>[0]);
    }

    // Summarize for Claude to avoid huge context
    const resources = result.resources ?? [];
    const summary = resources.slice(0, take as number).map((r: Record<string, unknown>) => ({
      id: r.id,
      name: r.name,
      city: r.city,
      zipCode: r.zipCode,
      resourceType: (r.resourceType as Record<string, unknown>)?.name,
      ratingAverage: r.ratingAverage,
      waitTimeMinutesAverage: r.waitTimeMinutesAverage,
      reviewCount: (r._count as Record<string, unknown>)?.reviews,
      subscriptions: (r._count as Record<string, unknown>)?.resourceSubscriptions,
      acceptingNewClients: r.acceptingNewClients,
      tags: ((r.tags as unknown[]) ?? []).map((t) => (t as Record<string, unknown>).name),
    }));

    return JSON.stringify({ count: result.count, resources: summary });
  }

  return "Tool not found";
}

function encodeSSE(payload: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function POST(req: NextRequest) {
  const { messages, role = "community" } = await req.json() as {
    messages: Anthropic.MessageParam[];
    role: UserRole;
  };

  const lastMessage = messages[messages.length - 1];
  const lastContent =
    typeof lastMessage?.content === "string"
      ? lastMessage.content
      : Array.isArray(lastMessage?.content)
      ? lastMessage.content
          .filter((b) => b.type === "text")
          .map((b) => (b as Anthropic.TextBlockParam).text)
          .join(" ")
      : "";

  const mode = detectMode(lastContent);
  const systemPrompt = buildSystemPrompt(mode, role as UserRole);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send mode to client immediately
        controller.enqueue(encodeSSE({ type: "mode", mode }));

        let currentMessages = [...messages];
        let continueLoop = true;

        while (continueLoop) {
          const response = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 4096,
            system: systemPrompt,
            messages: currentMessages,
            tools: TOOLS,
          });

          // Collect text and tool uses from response
          const toolUses: Anthropic.ToolUseBlock[] = [];

          for (const block of response.content) {
            if (block.type === "text") {
              // Stream text in chunks
              const words = block.text.split(" ");
              for (let i = 0; i < words.length; i += 5) {
                const chunk = words.slice(i, i + 5).join(" ") + (i + 5 < words.length ? " " : "");
                controller.enqueue(encodeSSE({ type: "text", content: chunk }));
              }
            } else if (block.type === "tool_use") {
              toolUses.push(block);

              if (block.name === "generate_chart") {
                // Stream chart spec directly to client
                controller.enqueue(encodeSSE({ type: "chart", spec: block.input }));
              } else if (block.name === "render_map") {
                // Stream map spec directly to client
                controller.enqueue(encodeSSE({ type: "map", spec: block.input }));
              }
            }
          }

          if (response.stop_reason === "tool_use" && toolUses.length > 0) {
            // Execute non-chart tools and continue the loop
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const toolUse of toolUses) {
              if (toolUse.name === "generate_chart") {
                // Chart already sent to client — return success to Claude
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: toolUse.id,
                  content: "Chart rendered successfully in the visualization panel.",
                });
              } else if (toolUse.name === "render_map") {
                // Map already sent to client — return success to Claude
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: toolUse.id,
                  content: "Map rendered successfully in the visualization panel.",
                });
              } else if (toolUse.name === "run_analysis") {
                try {
                  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
                  const res = await fetch(`${baseUrl}/api/analysis`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ job: (toolUse.input as { job: string }).job }),
                  });
                  const data = await res.json() as { result?: string; error?: string };
                  toolResults.push({
                    type: "tool_result",
                    tool_use_id: toolUse.id,
                    content: data.result ?? data.error ?? "Analysis failed",
                  });
                } catch {
                  toolResults.push({
                    type: "tool_result",
                    tool_use_id: toolUse.id,
                    content: "Analysis service unavailable",
                  });
                }
              } else {
                const result = await executeTool(
                  toolUse.name,
                  toolUse.input as Record<string, unknown>
                );
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: toolUse.id,
                  content: result,
                });
              }
            }

            // Append assistant turn + tool results and loop
            currentMessages = [
              ...currentMessages,
              { role: "assistant", content: response.content },
              { role: "user", content: toolResults },
            ];
          } else {
            continueLoop = false;
          }
        }

        controller.enqueue(encodeSSE({ type: "done" }));
        controller.close();
      } catch (err) {
        console.error("Chat API error:", err);
        controller.enqueue(
          encodeSSE({ type: "error", message: "Something went wrong. Please try again." })
        );
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
