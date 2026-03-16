import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/chatUtils";
import { runAgent } from "@/sandbox/agent";

export const runtime = "nodejs";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TOOLS: Anthropic.Tool[] = [
  {
    name: "run_analysis",
    description:
      "Run a Python data analysis in a sandbox environment with pre-loaded datasets (Lemontree resources/reviews, US Census demographics/poverty/income/housing/education/commute, USDA food environment, CDC health data, ZIP-to-county crosswalk). Use this when the user asks a question that requires data computation, aggregation, statistical analysis, cross-dataset joins, visualizations, or anything that cannot be answered from your general knowledge alone. Write a clear, specific job statement for the analyst.",
    input_schema: {
      type: "object" as const,
      required: ["job"],
      properties: {
        job: {
          type: "string",
          description: "Repeat the statement of what to analyze/determine. State the question/statement, not the methodology. DO NOT provide any additional information or context. ONLY state what the user asked for, nothing more or less.",
        },
      },
    },
  },
];

function encodeSSE(payload: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json() as {
    messages: Anthropic.MessageParam[];
  };

  const systemPrompt = buildSystemPrompt();

  const stream = new ReadableStream({
    async start(controller) {
      try {
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

          const toolUses: Anthropic.ToolUseBlock[] = [];

          for (const block of response.content) {
            if (block.type === "text") {
              const words = block.text.split(" ");
              for (let i = 0; i < words.length; i += 5) {
                const chunk = words.slice(i, i + 5).join(" ") + (i + 5 < words.length ? " " : "");
                controller.enqueue(encodeSSE({ type: "text", content: chunk }));
              }
            } else if (block.type === "tool_use") {
              toolUses.push(block);
            }
          }

          if (response.stop_reason === "tool_use" && toolUses.length > 0) {
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const toolUse of toolUses) {
              if (toolUse.name === "run_analysis") {
                try {
                  const job = (toolUse.input as { job: string }).job;
                  const result = await runAgent(job, (progress) => {
                    controller.enqueue(encodeSSE({ type: "progress", ...progress }));
                  });

                  if (result) {
                    controller.enqueue(encodeSSE({
                      type: "analysis",
                      answer: result.answer,
                      images: result.images ?? [],
                    }));

                    toolResults.push({
                      type: "tool_result",
                      tool_use_id: toolUse.id,
                      content: result.answer,
                    });
                  } else {
                    toolResults.push({
                      type: "tool_result",
                      tool_use_id: toolUse.id,
                      content: "Analysis did not produce a result",
                    });
                  }
                } catch (err) {
                  toolResults.push({
                    type: "tool_result",
                    tool_use_id: toolUse.id,
                    content: err instanceof Error ? err.message : "Analysis failed",
                  });
                }
              }
            }

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
