import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/** Basic Claude client — text in, text out */
export async function ask(prompt: string) {
  const stream = client.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      process.stdout.write(event.delta.text);
    }
  }

  console.log();
}

/** Claude client with code execution — runs code on Claude's servers */
export async function runCode(code: string) {
  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Run this Python code and show me the output. Do not explain it, just run it and return the raw output.\n\n\`\`\`python\n${code}\n\`\`\``,
      },
    ],
    tools: [{ type: "code_execution_20260120", name: "code_execution" }],
  });

  for (const block of response.content) {
    if (block.type === "bash_code_execution_tool_result") {
      const result = block.content;
      if (result.type === "bash_code_execution_result") {
        if (result.stdout) process.stdout.write(result.stdout);
        if (result.stderr) process.stderr.write(result.stderr);
      }
    }
  }
}
