import Anthropic from "@anthropic-ai/sdk";
import { Sandbox } from "@e2b/code-interpreter";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { SYSTEM_PROMPT } from "./systemPrompt";
import { TOOLS } from "./tools";

// CSV files to upload into the sandbox
const CSV_DIR = path.join(__dirname, "..", "data", "resources");
const CSV_FILES = ["resources.csv", "descriptions.csv", "shifts.csv", "occurrences.csv", "tags.csv", "flags.csv"];

// Python bootstrap that loads all CSVs into DataFrames
const PYTHON_BOOTSTRAP = `
import pandas as pd
import json

# Force string types on ID/zip columns so they don't get read as numbers
_str_cols = {"id", "resource_id", "shift_id", "resource_type_id", "resource_status_id",
             "source_id", "tag_category_id", "zip_code"}

def _load(path):
    df = pd.read_csv(path, dtype={c: str for c in _str_cols}, keep_default_na=True)
    return df

resources = _load("/home/user/data/resources.csv")
descriptions = _load("/home/user/data/descriptions.csv")
shifts = _load("/home/user/data/shifts.csv")
occurrences = _load("/home/user/data/occurrences.csv")
tags = _load("/home/user/data/tags.csv")
flags = _load("/home/user/data/flags.csv")

print(f"Loaded: resources={len(resources)}, descriptions={len(descriptions)}, shifts={len(shifts)}, occurrences={len(occurrences)}, tags={len(tags)}, flags={len(flags)}")
`;

const MAX_ITERATIONS = 12;
const MODEL = "claude-opus-4-5";
const MAX_CONSOLE_LINES = 20;

// After COMPACT_AFTER iterations, summarize older context using a fast model.
// The last KEEP_RECENT iteration pairs are kept fully intact.
const COMPACT_AFTER = 4;
const KEEP_RECENT = 3;
const SUMMARY_MODEL = "claude-haiku-4-5-20251001";

// Keep the first HEAD_LINES and last TAIL_LINES of output so Claude always sees
// the data shape (column headers) and the end of the output (summaries, totals).
// Anything in the middle is replaced with a count of omitted lines.
const HEAD_LINES = 30;
const TAIL_LINES = 10;
const MAX_LINE_LENGTH = 300;

function smartTruncate(text: string): string {
  // Truncate individual lines that are too wide (e.g. a single massive JSON blob)
  let lines = text.split("\n").map((line) =>
    line.length > MAX_LINE_LENGTH
      ? line.slice(0, MAX_LINE_LENGTH) + " ... (line truncated)"
      : line
  );

  // If the output fits, return as-is
  if (lines.length <= HEAD_LINES + TAIL_LINES) return lines.join("\n");

  // Keep head and tail so Claude sees column headers + final results
  const omitted = lines.length - HEAD_LINES - TAIL_LINES;
  return [
    ...lines.slice(0, HEAD_LINES),
    `\n... (${omitted} lines omitted)\n`,
    ...lines.slice(-TAIL_LINES),
  ].join("\n");
}

// Pre-installed packages for the sandbox environment.
// Covers data analysis, visualization, geo, and stats so Claude doesn't waste
// iterations pip-installing common libraries.
const SANDBOX_PACKAGES = [
  "pandas",
  "requests",
  "numpy",
  "matplotlib",
  "seaborn",
  "scipy",
  "geopy",
];

// Spin up an E2B sandbox with common data science libraries and pre-loaded CSV data.
async function initSandbox(): Promise<Sandbox> {
  const sandbox = await Sandbox.create({ apiKey: process.env.E2B_API_KEY });
  await sandbox.runCode(
    `import subprocess; subprocess.run(['pip', 'install', ${SANDBOX_PACKAGES.map((p) => `'${p}'`).join(", ")}, '-q'])`
  );

  // Upload CSV files into the sandbox
  await sandbox.runCode("import os; os.makedirs('/home/user/data', exist_ok=True)");
  for (const file of CSV_FILES) {
    const filePath = path.join(CSV_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`  Warning: ${filePath} not found, skipping`);
      continue;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    await sandbox.files.write(`/home/user/data/${file}`, content);
  }

  // Load CSVs into DataFrames
  await sandbox.runCode(PYTHON_BOOTSTRAP);
  return sandbox;
}

// Run Python code in the sandbox and return the smartly truncated output.
// Preserves head (column headers) and tail (summaries) of the output so
// Claude always sees the data shape and final results.
async function executePython(sandbox: Sandbox, code: string): Promise<string> {
  let execResult: any;
  try {
    execResult = await sandbox.runCode(code);
  } catch (err: any) {
    execResult = {
      logs: { stdout: [], stderr: [err.message] },
      error: err,
    };
  }

  const stdout = (execResult.logs.stdout || []).join("").trim();
  const stderr = (execResult.logs.stderr || []).join("").trim();
  const error = execResult.error?.value || "";

  // Print a short console preview
  if (stdout) {
    const lines = stdout.split("\n");
    const display =
      lines.length > MAX_CONSOLE_LINES
        ? [...lines.slice(0, MAX_CONSOLE_LINES), `... (${lines.length - MAX_CONSOLE_LINES} more lines)`]
        : lines;
    display.forEach((l) => console.log(`    ${l}`));
  }
  if (error) console.log(`  Error: ${error.split("\n")[0]}`);
  else if (stderr) console.log(`  Stderr: ${stderr.split("\n")[0]}`);

  // Build and smart-truncate the output sent back to Claude
  let output = "";
  if (stdout) output += smartTruncate(stdout);
  if (stderr) output += `\nSTDERR:\n${stderr.split("\n").slice(0, 5).join("\n")}`;
  if (error) output += `\nERROR:\n${error}`;

  return output || "(no output)";
}

// Summarize older messages using a fast model (Haiku) and replace them with
// a single summary message. Keeps the original job message and the last
// KEEP_RECENT iteration pairs intact. Only triggers after COMPACT_AFTER iterations.
// Returns true if compaction happened.
async function compactContext(
  anthropic: Anthropic,
  messages: Anthropic.MessageParam[]
): Promise<boolean> {
  // Keep first message (job) and last KEEP_RECENT pairs intact.
  // Everything in between is eligible for compaction.
  const keepTail = KEEP_RECENT * 2;
  const toSummarize = messages.slice(1, messages.length - keepTail);

  // Only compact when there are enough old messages worth summarizing.
  // At minimum we need COMPACT_AFTER pairs (2 messages each) in the old zone.
  if (toSummarize.length < COMPACT_AFTER * 2) return false;

  // Serialize the old messages into a readable format for the summarizer
  const transcript = toSummarize
    .map((msg) => {
      if (typeof msg.content === "string") {
        return `${msg.role}: ${msg.content}`;
      }
      if (Array.isArray(msg.content)) {
        const parts = msg.content.map((block: any) => {
          if (block.type === "text") return block.text;
          if (block.type === "tool_use") {
            const reasoning = (block.input as any)?.reasoning || "";
            const code = (block.input as any)?.code || "";
            return `[execute_python: ${reasoning}]\n${code}`;
          }
          if (block.type === "tool_result") {
            const content =
              typeof block.content === "string"
                ? block.content
                : JSON.stringify(block.content);
            return `[output]: ${content}`;
          }
          return "";
        });
        return `${msg.role}: ${parts.join("\n")}`;
      }
      return "";
    })
    .join("\n\n");

  console.log("  Compacting context...");

  const summary = await anthropic.messages.create({
    model: SUMMARY_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are summarizing the work-in-progress of a data analysis agent. Below is a transcript of the agent's earlier steps — the code it ran and the outputs it received. Summarize what was done, what was computed, what variables and files exist in the sandbox, and any key findings so far. Be specific about numbers, column names, variable names, and file paths. Be concise.\n\n${transcript}`,
      },
    ],
  });

  const summaryText =
    summary.content[0].type === "text" ? summary.content[0].text : "";

  // Replace the old messages with a single summary injected after the job message.
  // The conversation becomes: [job, summary, ...recent messages]
  messages.splice(1, toSummarize.length, {
    role: "user",
    content: `Summary of prior analysis steps:\n${summaryText}`,
  });

  // Need a valid assistant response after user message, insert a placeholder
  // only if the next message is also a user message (which would be invalid).
  if (messages[2]?.role === "user") {
    messages.splice(2, 0, {
      role: "assistant",
      content: [{ type: "text", text: "Understood, continuing the analysis." }],
    });
  }

  console.log("  Context compacted.\n");
  return true;
}

// Core agentic loop: sends the job to Claude, executes tool calls in a sandbox,
// and iterates until Claude calls finish_analysis or we hit MAX_ITERATIONS.
export async function runAgent(job: string) {
  console.log(`\nJob: ${job}\n`);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log("Setting up sandbox...");
  const sandbox = await initSandbox();
  console.log("Sandbox ready.\n");

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Complete the following data analysis job:\n\n${job}\n\nThe data is already loaded as DataFrames. Answer exactly what is asked — nothing more. Call finish_analysis as soon as you have the answer.`,
    },
  ];

  let finalReport: { answer: string } | null = null;

  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    console.log(`[${i}/${MAX_ITERATIONS}]`);

    // Summarize older iterations to keep context window lean
    await compactContext(anthropic, messages);

    // Ask Claude for the next step
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS as any,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    // Process each content block: print text, execute tools, or record the final report
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type === "text" && block.text.trim()) {
        console.log(`\n  ${block.text.trim()}`);
      }

      if (block.type !== "tool_use") continue;

      // finish_analysis = Claude is done, capture the report
      if (block.name === "finish_analysis") {
        finalReport = block.input as { answer: string };
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: "Report recorded.",
        });
        break;
      }

      // execute_python = run code in sandbox, return output to Claude
      if (block.name === "execute_python") {
        const { code, reasoning } = block.input as { code: string; reasoning: string };
        console.log(`\n  > ${reasoning}`);
        console.log(`  --- code ---\n${code}\n  --- end ---`);
        const output = await executePython(sandbox, code);
        const hasError = output.includes("ERROR:") || output.includes("Traceback");
        const budget = `[Step ${i}/${MAX_ITERATIONS}]`;
        let result = `${budget}\n${output}`;
        if (hasError) {
          result += "\n\nThe code above errored. Fix the issue and try again. Do not retry the exact same code.";
        }
        if (i >= MAX_ITERATIONS - 2) {
          result += "\n\nYou are running low on steps. Call finish_analysis with your best answer on the next step.";
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      }
    }

    // Feed tool results back into the conversation
    if (finalReport) {
      if (toolResults.length) messages.push({ role: "user", content: toolResults });
      break;
    }

    if (toolResults.length) {
      messages.push({ role: "user", content: toolResults });
    } else if (response.stop_reason === "end_turn") {
      // Claude stopped without using a tool or finishing — nudge it to finish
      messages.push({
        role: "user",
        content:
          `[Step ${i}/${MAX_ITERATIONS}] You stopped without calling finish_analysis. If you have enough data to answer the question, call finish_analysis now. Only run more code if you truly cannot answer yet.`,
      });
    }
  }

  await sandbox.kill();
  return finalReport;
}
