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
      "Search food resources from the Lemontree Food Helpline database. Use this to get real data about food pantries and soup kitchens. Always call this before generating a chart or map so you have real data to visualize.",
    input_schema: {
      type: "object" as const,
      properties: {
        text: {
          type: "string",
          description: "Text search query (e.g. 'food bank', 'soup kitchen')",
        },
        zipCode: {
          type: "string",
          description: "Filter by a single zip code e.g. '10001'",
        },
        region: {
          type: "string",
          description:
            "Comma-separated zip codes to search across multiple areas e.g. '10001,10002,10003'",
        },
        resourceTypeId: {
          type: "string",
          enum: ["FOOD_PANTRY", "SOUP_KITCHEN"],
          description: "Filter by resource type",
        },
        take: {
          type: "number",
          description: "Number of results to return (default 10, max 40)",
        },
      },
    },
  },
  {
    name: "generate_chart",
    description:
      "Render a chart in the user's visualization panel. Always call this after fetching data to create a visual. The chart will appear automatically in the side panel. Never fabricate data — only chart data returned by search_resources.",
    input_schema: {
      type: "object" as const,
      required: ["type", "title", "data", "xKey", "yKey"],
      properties: {
        type: {
          type: "string",
          enum: ["bar", "line", "pie"],
          description: "Chart type — bar for comparisons, pie for proportions, line for trends",
        },
        title: {
          type: "string",
          description: "Chart title displayed above the visualization",
        },
        data: {
          type: "array",
          description: "Array of data objects built from real fetched results",
          items: { type: "object" },
        },
        xKey: {
          type: "string",
          description: "Key in data objects for the X axis or category labels",
        },
        yKey: {
          type: "string",
          description: "Key in data objects for the Y axis or numeric value",
        },
        color: {
          type: "string",
          description: "Hex color for the chart e.g. '#22c55e' (default green)",
        },
        insight: {
          type: "string",
          description: "One-sentence key takeaway to display beneath the chart",
        },
      },
    },
  },
  {
    name: "render_map",
    description:
      "Render an interactive map of resource locations in the visualization panel. Use whenever the user asks about locations, geographic coverage, distribution, or gaps. Never fabricate coordinates — only map resources returned by search_resources.",
    input_schema: {
      type: "object" as const,
      required: ["title", "markers"],
      properties: {
        title: {
          type: "string",
          description: "Map title displayed above the visualization",
        },
        description: {
          type: "string",
          description: "Optional subtitle or context for the map",
        },
        markers: {
          type: "array",
          description: "Array of locations to pin on the map",
          items: {
            type: "object",
            required: ["id", "name", "latitude", "longitude"],
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              latitude: { type: "number" },
              longitude: { type: "number" },
              resourceType: {
                type: "string",
                description: "FOOD_PANTRY or SOUP_KITCHEN",
              },
              ratingAverage: { type: "number" },
              address: { type: "string" },
              reviewCount: { type: "number" },
            },
          },
        },
        centerLat: {
          type: "number",
          description: "Optional map center latitude",
        },
        centerLng: {
          type: "number",
          description: "Optional map center longitude",
        },
        zoom: {
          type: "number",
          description: "Optional initial zoom level (1–18, default 12)",
        },
        insight: {
          type: "string",
          description: "One-sentence key finding to display beneath the map",
        },
      },
    },
  },
];

async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  if (name === "search_resources") {
    const {
      text,
      zipCode,
      region,
      resourceTypeId,
      take = 10,
    } = input as {
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
      result = await getResourcesByZip(zipCode, { take });
    } else {
      result = await getResources({
        region,
        resourceTypeId,
        take,
      } as Parameters<typeof getResources>[0]);
    }

    const resources = result.resources ?? [];
    const summary = resources
      .slice(0, take as number)
      .map((r: Record<string, unknown>) => ({
        id: r.id,
        name: r.name,
        city: r.city,
        zipCode: r.zipCode,
        latitude: r.latitude,
        longitude: r.longitude,
        addressStreet1: r.addressStreet1,
        state: r.state,
        resourceType: (r.resourceType as Record<string, unknown>)?.id,
        ratingAverage: r.ratingAverage,
        reviewCount: (r._count as Record<string, unknown>)?.reviews,
        subscriptions: (r._count as Record<string, unknown>)?.resourceSubscriptions,
        confidence: r.confidence,
        tags: ((r.tags as unknown[]) ?? []).map(
          (t) => (t as Record<string, unknown>).name
        ),
        nextOccurrence:
          (r.occurrences as unknown[] | undefined)?.[0] != null
            ? ((r.occurrences as Record<string, unknown>[])[0].startTime ?? null)
            : null,
      }));

    return JSON.stringify({ count: result.count, resources: summary });
  }

  return JSON.stringify({ error: `Unknown tool: ${name}` });
}

function encodeSSE(payload: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function POST(req: NextRequest) {
  const { messages, role = "community" } = (await req.json()) as {
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
        // Send detected mode to client immediately so the UI can update
        controller.enqueue(encodeSSE({ type: "mode", mode }));

        let currentMessages = [...messages];
        let continueLoop = true;

        while (continueLoop) {
          // Use .stream() for real token-by-token text streaming,
          // then .finalMessage() to get the complete response for tool handling.
          const sdkStream = client.messages.stream({
            model: "claude-sonnet-4-5",
            max_tokens: 4096,
            system: systemPrompt,
            messages: currentMessages,
            tools: TOOLS,
          });

          // Forward text tokens to the client as they arrive
          sdkStream.on("text", (text) => {
            controller.enqueue(encodeSSE({ type: "text", content: text }));
          });

          // Wait for the full response so we can inspect tool calls
          const response = await sdkStream.finalMessage();

          // Handle tool_use blocks
          const toolUses: Anthropic.ToolUseBlock[] = [];

          for (const block of response.content) {
            if (block.type === "tool_use") {
              toolUses.push(block);

              if (block.name === "generate_chart") {
                // Send the chart spec to the client for immediate rendering
                controller.enqueue(
                  encodeSSE({ type: "chart", spec: block.input })
                );
              } else if (block.name === "render_map") {
                // Send the map spec to the client for immediate rendering
                controller.enqueue(
                  encodeSSE({ type: "map", spec: block.input })
                );
              }
            }
          }

          if (response.stop_reason === "tool_use" && toolUses.length > 0) {
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const toolUse of toolUses) {
              if (
                toolUse.name === "generate_chart" ||
                toolUse.name === "render_map"
              ) {
                // Visualization already sent to client — confirm to Claude
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: toolUse.id,
                  content: `${toolUse.name === "render_map" ? "Map" : "Chart"} rendered successfully in the visualization panel.`,
                });
              } else {
                // Execute data-fetching tools and return results to Claude
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

            // Append this assistant turn + tool results, then loop for Claude's next response
            currentMessages = [
              ...currentMessages,
              { role: "assistant", content: response.content },
              { role: "user", content: toolResults },
            ];
          } else {
            // No tool calls — Claude is done
            continueLoop = false;
          }
        }

        controller.enqueue(encodeSSE({ type: "done" }));
        controller.close();
      } catch (err) {
        console.error("Chat API error:", err);
        controller.enqueue(
          encodeSSE({
            type: "error",
            message: "Something went wrong. Please try again.",
          })
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
