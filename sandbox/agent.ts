import Anthropic from "@anthropic-ai/sdk";
import { Sandbox } from "@e2b/code-interpreter";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { SYSTEM_PROMPT } from "./systemPrompt";
import { TOOLS } from "./tools";

<<<<<<< HEAD
// Data directories and files to upload
const DATA_SETS: [string, string[]][] = [
  ["resources", ["resources.csv", "shifts.csv", "occurrences.csv", "tags.csv", "flags.csv"]],
  ["census", ["demographics.csv", "poverty.csv", "income.csv", "housing.csv", "education.csv", "geography.csv", "commute.csv"]],
  ["usda", ["food_environment.csv"]],
  ["crosswalk", ["zip_county.csv"]],
  ["cdc", ["health.csv"]],
  ["reviews", ["reviews.csv"]],
];
=======
// CSV files to upload into the sandbox
const CSV_DIR = path.join(__dirname, "..", "data", "resources");
const CSV_FILES = ["resources.csv", "descriptions.csv", "shifts.csv", "occurrences.csv", "tags.csv", "flags.csv"];
>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1

// Python bootstrap that loads all CSVs into DataFrames
const PYTHON_BOOTSTRAP = `
import pandas as pd
<<<<<<< HEAD
import numpy as np
import json
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

# Auto-save charts to /home/user/charts/ on every plt.show()
os.makedirs('/home/user/charts', exist_ok=True)
_chart_counter = [0]
_original_show = plt.show

def _saving_show(*args, **kwargs):
    for fig_num in plt.get_fignums():
        fig = plt.figure(fig_num)
        _chart_counter[0] += 1
        fig.savefig(f'/home/user/charts/{_chart_counter[0]:03d}.png', dpi=150, bbox_inches='tight')
    plt.close('all')

plt.show = _saving_show

=======
import json
>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1

# Force string types on ID/zip columns so they don't get read as numbers
_str_cols = {"id", "resource_id", "shift_id", "resource_type_id", "resource_status_id",
             "source_id", "tag_category_id", "zip_code"}

<<<<<<< HEAD
_census_str_cols = {"fips", "state_fips", "county_fips"}
_usda_str_cols = {"fips"}

def _load(path, str_cols=_str_cols):
    df = pd.read_csv(path, dtype={c: str for c in str_cols}, keep_default_na=True)
    return df

# Lemontree data
resources = _load("/home/user/data/resources/resources.csv")
shifts = _load("/home/user/data/resources/shifts.csv")
occurrences = _load("/home/user/data/resources/occurrences.csv")
tags = _load("/home/user/data/resources/tags.csv")
flags = _load("/home/user/data/resources/flags.csv")

# Census data
census_demographics = _load("/home/user/data/census/demographics.csv", _census_str_cols)
census_poverty = _load("/home/user/data/census/poverty.csv", _census_str_cols)
census_income = _load("/home/user/data/census/income.csv", _census_str_cols)
census_housing = _load("/home/user/data/census/housing.csv", _census_str_cols)
census_education = _load("/home/user/data/census/education.csv", _census_str_cols)
census_geography = _load("/home/user/data/census/geography.csv", _census_str_cols)

# USDA Food Environment Atlas (snapshot, not time-series)
usda_food_env = _load("/home/user/data/usda/food_environment.csv", _usda_str_cols)

# ZIP-to-county crosswalk (maps zip_code -> county FIPS)
zip_county = _load("/home/user/data/crosswalk/zip_county.csv", {"zip_code", "fips", "state_fips", "county_fips"})

# Census commute/transportation data
census_commute = _load("/home/user/data/census/commute.csv", _census_str_cols)

# CDC PLACES health data (2023 snapshot by county)
cdc_health = _load("/home/user/data/cdc/health.csv", {"fips"})

# Reviews (generated dataset, not tied to specific resources)
reviews = pd.read_csv("/home/user/data/reviews/reviews.csv", parse_dates=["created_at"], keep_default_na=True)

print(f"Lemontree: resources={len(resources)}, shifts={len(shifts)}, occurrences={len(occurrences)}, tags={len(tags)}, flags={len(flags)}")
print(f"Census: demographics={len(census_demographics)}, poverty={len(census_poverty)}, income={len(census_income)}, housing={len(census_housing)}, education={len(census_education)}, commute={len(census_commute)}, geography={len(census_geography)}")
print(f"USDA: food_environment={len(usda_food_env)}")
print(f"CDC: health={len(cdc_health)}")
print(f"Crosswalk: zip_county={len(zip_county)}")
print(f"Reviews: {len(reviews)}")
`;

const MAX_ITERATIONS = 25;
const MODEL = "claude-opus-4-5";
const MAX_CONSOLE_LINES = 20;

// After COMPACT_AFTER iterations, summarize older context using a fast model.
// The last KEEP_RECENT iteration pairs are kept fully intact.
const COMPACT_AFTER = 6;
const KEEP_RECENT = 4;
const SUMMARY_MODEL = "claude-haiku-4-5-20251001";

// Keep the first HEAD_LINES and last TAIL_LINES of output so Claude always sees
// the data shape (column headers) and the end of the output (summaries, totals).
// Anything in the middle is replaced with a count of omitted lines.
=======
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
const MODEL = "claude-opus-4-6";
const MAX_CONSOLE_LINES = 20;

const COMPACT_AFTER = 4;
const KEEP_RECENT = 3;
const SUMMARY_MODEL = "claude-haiku-4-5-20251001";

>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1
const HEAD_LINES = 30;
const TAIL_LINES = 10;
const MAX_LINE_LENGTH = 300;

function smartTruncate(text: string): string {
<<<<<<< HEAD
  // Truncate individual lines that are too wide (e.g. a single massive JSON blob)
=======
>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1
  let lines = text.split("\n").map((line) =>
    line.length > MAX_LINE_LENGTH
      ? line.slice(0, MAX_LINE_LENGTH) + " ... (line truncated)"
      : line
  );

<<<<<<< HEAD
  // If the output fits, return as-is
  if (lines.length <= HEAD_LINES + TAIL_LINES) return lines.join("\n");

  // Keep head and tail so Claude sees column headers + final results
=======
  if (lines.length <= HEAD_LINES + TAIL_LINES) return lines.join("\n");

>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1
  const omitted = lines.length - HEAD_LINES - TAIL_LINES;
  return [
    ...lines.slice(0, HEAD_LINES),
    `\n... (${omitted} lines omitted)\n`,
    ...lines.slice(-TAIL_LINES),
  ].join("\n");
}

<<<<<<< HEAD
const SANDBOX_PACKAGES = ["pandas", "numpy", "matplotlib", "seaborn", "scipy", "geopy"];

async function initSandbox(): Promise<Sandbox> {
  const sandbox = await Sandbox.create({ apiKey: process.env.E2B_API_KEY, timeout: 1200 });
=======
const SANDBOX_PACKAGES = [
  "pandas",
  "requests",
  "numpy",
  "matplotlib",
  "seaborn",
  "scipy",
  "geopy",
];

async function initSandbox(): Promise<Sandbox> {
  const sandbox = await Sandbox.create({ apiKey: process.env.E2B_API_KEY });
>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1
  await sandbox.runCode(
    `import subprocess; subprocess.run(['pip', 'install', ${SANDBOX_PACKAGES.map((p) => `'${p}'`).join(", ")}, '-q'])`
  );

<<<<<<< HEAD
  // Upload all data files
  for (const [dir, files] of DATA_SETS) {
    await sandbox.runCode(`import os; os.makedirs('/home/user/data/${dir}', exist_ok=True)`);
    for (const file of files) {
      const filePath = path.join(__dirname, "data", dir, file);
      if (!fs.existsSync(filePath)) {
        console.warn(`  Warning: ${filePath} not found, skipping`);
        continue;
      }
      const content = fs.readFileSync(filePath, "utf-8");
      await sandbox.files.write(`/home/user/data/${dir}/${file}`, content);
    }
  }

  await sandbox.runCode("import os; os.makedirs('/home/user/charts', exist_ok=True)");
=======
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

>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1
  await sandbox.runCode(PYTHON_BOOTSTRAP);
  return sandbox;
}

<<<<<<< HEAD
export interface ExecutionResult {
  text: string;
  images: string[]; // base64 PNG strings
}

// Run Python code in the sandbox and return the smartly truncated output + any images.
async function executePython(sandbox: Sandbox, code: string): Promise<ExecutionResult> {
=======
async function executePython(sandbox: Sandbox, code: string): Promise<string> {
>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1
  let execResult: any;
  try {
    execResult = await sandbox.runCode(code);
  } catch (err: any) {
    execResult = {
      logs: { stdout: [], stderr: [err.message] },
      error: err,
<<<<<<< HEAD
      results: [],
=======
>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1
    };
  }

  const stdout = (execResult.logs.stdout || []).join("").trim();
  const stderr = (execResult.logs.stderr || []).join("").trim();
  const error = execResult.error?.value || "";

<<<<<<< HEAD
  // Collect any new chart images saved by our plt.show() override
  const images: string[] = [];
  try {
    const listResult = await sandbox.runCode("import os, base64; files = sorted(os.listdir('/home/user/charts')); print('\\n'.join(files))");
    const chartFiles = (listResult.logs.stdout || []).join("").trim().split("\n").filter(Boolean);
    for (const file of chartFiles) {
      const readResult = await sandbox.runCode(`with open('/home/user/charts/${file}', 'rb') as f: print(base64.b64encode(f.read()).decode())`);
      const b64 = (readResult.logs.stdout || []).join("").trim();
      if (b64) images.push(b64);
    }
    // Clear charts directory for next execution
    if (chartFiles.length > 0) {
      await sandbox.runCode("import glob, os\nfor f in glob.glob('/home/user/charts/*.png'): os.remove(f)");
    }
  } catch { };

  // Print a short console preview
=======
>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1
  if (stdout) {
    const lines = stdout.split("\n");
    const display =
      lines.length > MAX_CONSOLE_LINES
        ? [...lines.slice(0, MAX_CONSOLE_LINES), `... (${lines.length - MAX_CONSOLE_LINES} more lines)`]
        : lines;
<<<<<<< HEAD
    display.forEach((l: any) => console.log(`    ${l}`));
=======
    display.forEach((l: string) => console.log(`    ${l}`));
>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1
  }
  if (error) console.log(`  Error: ${error.split("\n")[0]}`);
  else if (stderr) console.log(`  Stderr: ${stderr.split("\n")[0]}`);

<<<<<<< HEAD
  // Build and smart-truncate the output sent back to Claude
=======
>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1
  let output = "";
  if (stdout) output += smartTruncate(stdout);
  if (stderr) output += `\nSTDERR:\n${stderr.split("\n").slice(0, 5).join("\n")}`;
  if (error) output += `\nERROR:\n${error}`;
<<<<<<< HEAD
  if (images.length) output += `\n[${images.length} image(s) generated]`;

  return { text: output || "(no output)", images };
}

// Summarize older messages using a fast model (Haiku) and replace them with
// a single summary message. Keeps the original job message and the last
// KEEP_RECENT iteration pairs intact. Only triggers after COMPACT_AFTER iterations.
// Returns true if compaction happened.
=======

  return output || "(no output)";
}

>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1
async function compactContext(
  anthropic: Anthropic,
  messages: Anthropic.MessageParam[]
): Promise<boolean> {
<<<<<<< HEAD
  // Keep first message (job) and last KEEP_RECENT pairs intact.
  // Everything in between is eligible for compaction.
  const keepTail = KEEP_RECENT * 2;
  const toSummarize = messages.slice(1, messages.length - keepTail);

  // Only compact when there are enough old messages worth summarizing.
  // At minimum we need COMPACT_AFTER pairs (2 messages each) in the old zone.
  if (toSummarize.length < COMPACT_AFTER * 2) return false;

  // Serialize the old messages into a readable format for the summarizer
=======
  const keepTail = KEEP_RECENT * 2;
  const toSummarize = messages.slice(1, messages.length - keepTail);

  if (toSummarize.length < COMPACT_AFTER * 2) return false;

>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1
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

<<<<<<< HEAD
  // Replace the old messages with a single summary injected after the job message.
  // The conversation becomes: [job, summary, ...recent messages]
=======
>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1
  messages.splice(1, toSummarize.length, {
    role: "user",
    content: `Summary of prior analysis steps:\n${summaryText}`,
  });

<<<<<<< HEAD
  // Need a valid assistant response after user message, insert a placeholder
  // only if the next message is also a user message (which would be invalid).
=======
>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1
  if (messages[2]?.role === "user") {
    messages.splice(2, 0, {
      role: "assistant",
      content: [{ type: "text", text: "Understood, continuing the analysis." }],
    });
  }

  console.log("  Context compacted.\n");
  return true;
}

<<<<<<< HEAD
// Core agentic loop: sends the job to Claude, executes tool calls in a sandbox,
// and iterates until Claude calls finish_analysis or we hit MAX_ITERATIONS.
=======
>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1
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
<<<<<<< HEAD
  const allImages: string[] = [];
=======
>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1

  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    console.log(`[${i}/${MAX_ITERATIONS}]`);

<<<<<<< HEAD
    // Summarize older iterations to keep context window lean
    await compactContext(anthropic, messages);

    // Ask Claude for the next step
=======
    await compactContext(anthropic, messages);

>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS as any,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

<<<<<<< HEAD
    // Process each content block: print text, execute tools, or record the final report
=======
>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type === "text" && block.text.trim()) {
        console.log(`\n  ${block.text.trim()}`);
      }

      if (block.type !== "tool_use") continue;

<<<<<<< HEAD
      // finish_analysis = Claude is done, capture the report
=======
>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1
      if (block.name === "finish_analysis") {
        finalReport = block.input as { answer: string };
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: "Report recorded.",
        });
        break;
      }

<<<<<<< HEAD
      // execute_python = run code in sandbox, return output to Claude
      if (block.name === "execute_python") {
        const { code, reasoning } = block.input as { code: string; reasoning: string };
        console.log(`\n  > ${reasoning}`);
        console.log(`  --- code ---\n${code}\n  --- end ---`);
        const { text: output, images } = await executePython(sandbox, code);
        if (images.length) {
          allImages.push(...images);
          console.log(`  [${images.length} image(s) captured]`);
        }
=======
      if (block.name === "execute_python") {
        const { code, reasoning } = block.input as { code: string; reasoning: string };
        console.log(`\n  > ${reasoning}`);
        const output = await executePython(sandbox, code);
>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1
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

<<<<<<< HEAD
    // Feed tool results back into the conversation
=======
>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1
    if (finalReport) {
      if (toolResults.length) messages.push({ role: "user", content: toolResults });
      break;
    }

    if (toolResults.length) {
      messages.push({ role: "user", content: toolResults });
    } else if (response.stop_reason === "end_turn") {
<<<<<<< HEAD
      // Claude stopped without using a tool or finishing — nudge it to finish
=======
>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1
      messages.push({
        role: "user",
        content:
          `[Step ${i}/${MAX_ITERATIONS}] You stopped without calling finish_analysis. If you have enough data to answer the question, call finish_analysis now. Only run more code if you truly cannot answer yet.`,
      });
    }
  }

  await sandbox.kill();
<<<<<<< HEAD
  return finalReport ? { ...finalReport, images: allImages } : null;
=======
  return finalReport;
>>>>>>> 96fddce600fcd9041eff44bca6e36a1075c992e1
}
