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
import random
import hashlib
import requests
from urllib.parse import urlparse
from datetime import datetime
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch

ALLOWED_DOMAINS = {"platform.foodhelpline.org"}

def _is_allowed_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
    except Exception:
        return False
    return parsed.scheme == "https" and parsed.netloc in ALLOWED_DOMAINS

_original_request = requests.request

def _guarded_request(method, url, **kwargs):
    if not _is_allowed_url(url):
        raise PermissionError(f"Blocked outbound request to non-allowlisted host: {url}")
    timeout = kwargs.pop("timeout", 10)
    return _original_request(method, url, timeout=timeout, **kwargs)

requests.request = _guarded_request
requests.get = lambda url, **kwargs: _guarded_request("GET", url, **kwargs)

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

`;
# --- CORE ANALYSIS FUNCTIONS ---

def filter_resources(
    zip=None,
    region=None,
    city=None,
    resource_type=None,
    status=None,
    priority_min=None,
    resource_ids=None,
):
    """
    Flexible filter over the local resources DataFrame.
    """
    df = resources.copy()

    if zip is not None:
        df = df[df["zip_code"] == str(zip)]
    if city is not None:
        df = df[df["city"].str.lower() == str(city).lower()]
    if region is not None:
        region_l = str(region).lower()
        mask = (
            df["city"].str.lower().str.contains(region_l, na=False)
            | df["address_street1"].str.lower().str.contains(region_l, na=False)
        )
        df = df[mask]
    if resource_type is not None and "resource_type_id" in df.columns:
        df = df[df["resource_type_id"] == str(resource_type)]
    if status is not None and "resource_status_id" in df.columns:
        df = df[df["resource_status_id"] == str(status)]
    if priority_min is not None and "priority" in df.columns:
        df["priority"] = pd.to_numeric(df["priority"], errors="coerce").fillna(-1)
        df = df[df["priority"] >= int(priority_min)]
    if resource_ids is not None:
        ids = set([str(x) for x in resource_ids])
        df = df[df["id"].isin(ids)]
    return df

def filter_occurrences(resource_ids=None, date_from=None, date_to=None, include_cancelled=False):
    """
    Filter occurrences by resource_ids and date window.
    """
    df = occurrences.copy()
    if not include_cancelled and "skipped_at" in df.columns:
        df = df[df["skipped_at"].isna()]
    if resource_ids is not None:
        ids = set([str(x) for x in resource_ids])
        df = df[df["resource_id"].isin(ids)]
    if "start_time" in df.columns:
        df["start_time"] = pd.to_datetime(df["start_time"], errors="coerce")
        if date_from is not None:
            df = df[df["start_time"] >= pd.to_datetime(date_from)]
        if date_to is not None:
            df = df[df["start_time"] <= pd.to_datetime(date_to)]
    return df

def _seeded_rng(seed: str) -> random.Random:
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    return random.Random(int(digest[:16], 16))

def _pick(rng: random.Random, arr):
    return arr[rng.randrange(0, len(arr))]

def _weighted_pick(rng: random.Random, items, weights):
    total = sum(weights)
    roll = rng.random() * total
    for item, weight in zip(items, weights):
        roll -= weight
        if roll <= 0:
            return item
    return items[-1]

def _random_date(rng: random.Random, days_back=365):
    now = pd.Timestamp.utcnow()
    offset = pd.Timedelta(
        days=rng.randint(0, days_back),
        hours=rng.randint(0, 23),
        minutes=rng.randint(0, 59),
    )
    return (now - offset).isoformat()

POSITIVE_TEXTS = [
    "Amazing variety of fresh produce today.",
    "Really impressed with the selection.",
    "Staff were so helpful and respectful.",
    "Wonderful experience.",
]

NEUTRAL_TEXTS = [
    "Decent selection but ran out of bread by the time I got there.",
    "Wait was longer than usual today.",
    "Got some basics but selection was more limited than previous visits.",
    "Fine experience overall.",
]

NEGATIVE_TEXTS = [
    "Arrived at 10am and was told they were already out of food.",
    "The listing says open until 2pm but they closed at noon.",
    "Waited over an hour only to be told they couldn't help me without an ID.",
    "Hours on the website are completely wrong.",
]

DID_NOT_ATTEND_REASONS = [
    "Location was closed when I arrived",
    "Arrived too late, they had stopped distributing",
    "Too far to travel without transportation",
    "Ran out of food before I reached the front",
]

def _generate_reviews(resource_id, review_count=10):
    rng = _seeded_rng(resource_id)
    reviews = []
    for _ in range(review_count):
        outcome_roll = rng.random()

        if outcome_roll < 0.6:
            attended = True
            rating = _weighted_pick(rng, [5, 4, 3], [50, 35, 15])
            text = _pick(rng, POSITIVE_TEXTS)
            wait = rng.randint(5, 30)
        elif outcome_roll < 0.85:
            attended = True
            rating = _weighted_pick(rng, [3, 2], [60, 40])
            text = _pick(rng, NEUTRAL_TEXTS)
            wait = rng.randint(20, 75)
        else:
            attended = rng.random() > 0.4
            rating = _weighted_pick(rng, [2, 1], [40, 60])
            text = _pick(rng, NEGATIVE_TEXTS)
            wait = rng.randint(0, 90) if attended else None

        reviews.append({
            "id": hashlib.md5(f"{resource_id}-{rng.random()}".encode("utf-8")).hexdigest(),
            "created_at": _random_date(rng, 365),
            "resource_id": str(resource_id),
            "attended": attended,
            "did_not_attend_reason": _pick(rng, DID_NOT_ATTEND_REASONS) if not attended else None,
            "rating": rating,
            "text": text if rng.random() > 0.1 else None,
            "wait_time_minutes": wait,
        })
    return pd.DataFrame(reviews)

def filter_reviews(
    resource_ids=None,
    date_from=None,
    date_to=None,
    attended=None,
    rating_min=None,
    max_resources=25,
):
    """
    Aggregate synthetic reviews across resources and apply filters.
    """
    if resource_ids is None:
        resource_ids = resources["id"].head(int(max_resources)).tolist()
    reviews = pd.concat([_generate_reviews(rid, 15) for rid in resource_ids], ignore_index=True)
    if reviews.empty:
        return reviews
    reviews["created_at"] = pd.to_datetime(reviews["created_at"], errors="coerce")
    if date_from is not None:
        reviews = reviews[reviews["created_at"] >= pd.to_datetime(date_from)]
    if date_to is not None:
        reviews = reviews[reviews["created_at"] <= pd.to_datetime(date_to)]
    if attended is not None and "attended" in reviews.columns:
        reviews = reviews[reviews["attended"] == bool(attended)]
    if rating_min is not None and "rating" in reviews.columns:
        reviews = reviews[pd.to_numeric(reviews["rating"], errors="coerce") >= float(rating_min)]
    return reviews

def query_resources(filters=None, group_by=None, metrics=None):
    """
    General purpose aggregation helper for resources.
    """
    df = filter_resources(**filters) if filters else resources.copy()
    if metrics is None:
        metrics = {"count": ("id", "count")}
    if group_by:
        grouped = df.groupby(group_by)
        agg_spec = {}
        for out_name, spec in metrics.items():
            if isinstance(spec, (list, tuple)) and len(spec) == 2:
                col, agg = spec
            else:
                col, agg = spec, "count"
            agg_spec[out_name] = pd.NamedAgg(column=col, aggfunc=agg)
        result = grouped.agg(**agg_spec).reset_index()
        return result
    summary = {}
    for out_name, spec in metrics.items():
        if isinstance(spec, (list, tuple)) and len(spec) == 2:
            col, agg = spec
        else:
            col, agg = spec, "count"
        summary[out_name] = getattr(df[col], agg)() if col in df.columns else None
    return pd.DataFrame([summary])

def trend(metric, group_by_time="week", filters=None, per=None, source="reviews"):
    """
    Universal trend helper. Currently supports review-based metrics.
    """
    if source != "reviews":
        raise ValueError("Only source='reviews' is supported for trend() right now.")
    reviews = filter_reviews(**(filters or {}))
    if reviews.empty or metric not in reviews.columns:
        return pd.DataFrame(columns=[group_by_time, metric])
    reviews["created_at"] = pd.to_datetime(reviews["created_at"], errors="coerce")
    reviews = reviews.dropna(subset=["created_at"])
    if group_by_time == "month":
        reviews["period"] = reviews["created_at"].dt.to_period("M").apply(lambda p: p.start_time.date())
    else:
        reviews["period"] = reviews["created_at"].dt.to_period("W").apply(lambda p: p.start_time.date())
    if per:
        merged = reviews.merge(resources[["id", per]], left_on="resource_id", right_on="id", how="left")
        grouped = merged.groupby(["period", per])[metric].mean().reset_index()
        return grouped.rename(columns={"period": group_by_time})
    grouped = reviews.groupby("period")[metric].mean().reset_index()
    return grouped.rename(columns={"period": group_by_time})

def gap_analysis(level="city", min_resources=1, filters=None):
    """
    Identify underserved areas by minimum resource count.
    """
    df = filter_resources(**filters) if filters else resources.copy()
    if level == "zip":
        counts = df["zip_code"].value_counts()
    elif level == "region":
        if "region_ids" not in df.columns:
            return {"counts": {}, "underserved": []}
        exploded = df["region_ids"].dropna().apply(json.loads).explode()
        counts = exploded.value_counts()
    else:
        counts = df["city"].value_counts()
    underserved = counts[counts <= int(min_resources)].index.tolist()
    return {"counts": counts.head(25).to_dict(), "underserved": underserved}

def fetch_json(url):
    """
    Fetch JSON from an allowlisted host.
    """
    response = requests.get(url)
    response.raise_for_status()
    return response.json()

def load_public_dataset(path_or_url):
    """
    Load a public dataset from local path or allowlisted URL.
    """
    if isinstance(path_or_url, str) and path_or_url.startswith("http"):
        if not _is_allowed_url(path_or_url):
            raise PermissionError("Blocked public dataset URL (not allowlisted).")
        return pd.read_csv(path_or_url)
    return pd.read_csv(path_or_url)

def join_on_geo(resources_df, public_df, on="zip_code"):
    """
    Join resources with a public dataset on a geographic key.
    """
    return resources_df.merge(public_df, on=on, how="left")

def _ensure_export_dir():
    export_dir = "/home/user/exports"
    os.makedirs(export_dir, exist_ok=True)
    return export_dir

def generate_pdf_report(report_dict, image_paths=None, title="Lemontree Report"):
    """
    Create a PDF report with text and optional images.
    """
    if not isinstance(report_dict, dict) or not report_dict:
        raise ValueError("report_dict must be a non-empty dict.")
    if image_paths is not None and not isinstance(image_paths, list):
        raise ValueError("image_paths must be a list of file paths or None.")
    if not isinstance(title, str) or not title.strip():
        raise ValueError("title must be a non-empty string.")

    export_dir = _ensure_export_dir()
    ts = int(datetime.utcnow().timestamp())
    path = os.path.join(export_dir, f"report_{ts}.pdf")
    c = canvas.Canvas(path, pagesize=letter)
    width, height = letter

    c.setFont("Helvetica-Bold", 16)
    c.drawString(1 * inch, height - 1 * inch, title.strip())

    c.setFont("Helvetica", 10)
    text = c.beginText(1 * inch, height - 1.5 * inch)
    text.textLines(json.dumps(report_dict, indent=2))
    c.drawText(text)

    image_paths = image_paths or []
    for img_path in image_paths:
        c.showPage()
        c.setFont("Helvetica-Bold", 12)
        c.drawString(1 * inch, height - 1 * inch, "Chart")
        try:
            c.drawImage(
                img_path,
                1 * inch,
                2 * inch,
                width - 2 * inch,
                height - 3 * inch,
                preserveAspectRatio=True,
                anchor="c",
            )
        except Exception:
            c.setFont("Helvetica", 10)
            c.drawString(1 * inch, height - 1.5 * inch, f"Could not load image: {img_path}")

    c.save()
    return path

print(f"Loaded: resources={len(resources)}, descriptions={len(descriptions)}, shifts={len(shifts)}, occurrences={len(occurrences)}, tags={len(tags)}, flags={len(flags)}")
print("Pre-loaded Functions: filter_resources(), filter_occurrences(), filter_reviews(), query_resources(), trend(), gap_analysis(), fetch_json(), load_public_dataset(), join_on_geo(), generate_pdf_report()")

const MAX_ITERATIONS = 5;
const MODEL = "claude-opus-4-5";
const MAX_CONSOLE_LINES = 20;

// After COMPACT_AFTER iterations, summarize older context using a fast model.
// The last KEEP_RECENT iteration pairs are kept fully intact.
const COMPACT_AFTER = 3;
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
  "reportlab",
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

export async function createSandbox(): Promise<Sandbox> {
  return initSandbox();
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

export async function runPython(sandbox: Sandbox, code: string): Promise<string> {
  return executePython(sandbox, code);
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
