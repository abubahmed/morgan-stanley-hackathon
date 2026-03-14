/**
 * Autonomous Data Analysis Agent
 * Claude + E2B — agentic loop for food resource data
 *
 * Usage:
 *   E2B_API_KEY=xxx ANTHROPIC_API_KEY=xxx node agent.mjs "Analyze food pantry coverage by zip code"
 *   node agent.mjs --job "Find regions with the fewest open resources today"
 */

import Anthropic from "@anthropic-ai/sdk";
import { Sandbox } from "@e2b/code-interpreter";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Config ──────────────────────────────────────────────────────────────────

const MAX_ITERATIONS = 12;
const MODEL = "claude-opus-4-5";

// ─── Debug helpers ────────────────────────────────────────────────────────────

function ts() {
  return new Date().toISOString().split("T")[1].slice(0, 12);
}
function dbg(label, ...args) {
  console.log(`  [${ts()}] DBG ${label}`, ...args);
}

function dumpBlock(role, block) {
  if (block.type === "text") {
    dbg(`${role} [text]: ${block.text.slice(0, 300)}`);
  } else if (block.type === "tool_use") {
    dbg(`${role} [tool_use] ${block.name}: ${JSON.stringify(block.input).slice(0, 300)}`);
  } else if (block.type === "tool_result") {
    const content = typeof block.content === "string" ? block.content : JSON.stringify(block.content);
    dbg(`${role} [tool_result ${block.tool_use_id}]: ${content.slice(0, 300)}`);
  }
}

function dumpConversation(messages) {
  console.log(`\n  ┌── Conversation (${messages.length} messages) ──`);
  for (const [i, msg] of messages.entries()) {
    const role = msg.role.toUpperCase();
    if (typeof msg.content === "string") {
      console.log(`  │ [${i}] ${role}: ${msg.content.slice(0, 400)}`);
    } else if (Array.isArray(msg.content)) {
      console.log(`  │ [${i}] ${role}:`);
      for (const block of msg.content) dumpBlock(`  │      `, block);
    }
  }
  console.log(`  └──────────────────────────────────\n`);
}

// ─── The Lemontree helper source injected into every sandbox ─────────────────
// This is the data-layer the agent can use. We translate the TS API to Python.

const PYTHON_DATA_LAYER = `
import requests
import pandas as pd
import json
from datetime import datetime, timezone, timedelta

BASE_URL = "https://platform.foodhelpline.org"

def _fetch(path, params=None):
    params = {k: v for k, v in (params or {}).items() if v is not None}
    r = requests.get(BASE_URL + path, params=params, timeout=30)
    r.raise_for_status()
    raw = r.json()
    return raw.get("json", raw)

# ── Core fetchers ─────────────────────────────────────────────────────────────

def get_resources(**kwargs):
    """Fetch one page of resources. Returns dict with 'resources' list and optional 'cursor'."""
    return _fetch("/api/resources", kwargs)

def get_all_resources(**kwargs):
    """Fetch ALL resources, auto-paginating. Returns flat list."""
    all_resources = []
    cursor = None
    while True:
        params = {**kwargs, "take": kwargs.get("take", 40)}
        if cursor:
            params["cursor"] = cursor
        res = get_resources(**params)
        all_resources.extend(res.get("resources", []))
        cursor = res.get("cursor")
        if not cursor:
            break
    return all_resources

def get_resource_by_id(resource_id):
    return _fetch(f"/api/resources/{resource_id}")

def get_resources_near(lat, lng, **kwargs):
    return get_resources(lat=lat, lng=lng, sort="distance", **kwargs)

def get_resources_by_zip(zip_code, **kwargs):
    return get_resources(location=zip_code, **kwargs)

def get_resources_by_region(region, **kwargs):
    return get_resources(region=region, **kwargs)

def search_resources(text, **kwargs):
    return get_resources(text=text, **kwargs)

def get_resources_open_between(start_iso, end_iso, **kwargs):
    return get_resources(occurrencesWithin=f"{start_iso}/{end_iso}", **kwargs)

def get_resources_open_today(**kwargs):
    now = datetime.now(timezone.utc)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = now.replace(hour=23, minute=59, second=59, microsecond=0)
    return get_resources_open_between(start.isoformat(), end.isoformat(), **kwargs)

def get_map_markers(sw_lat, sw_lng, ne_lat, ne_lng):
    url = f"{BASE_URL}/api/resources/markersWithinBounds"
    params = [("corner", f"{sw_lat},{sw_lng}"), ("corner", f"{ne_lat},{ne_lng}")]
    r = requests.get(url, params=params, timeout=30)
    r.raise_for_status()
    return r.json()

# ── Convenience: load straight to DataFrame ──────────────────────────────────

def resources_to_df(resources):
    """Flatten a list of resource dicts into a tidy DataFrame."""
    rows = []
    for r in resources:
        addr = r.get("address") or {}
        rows.append({
            "id": r.get("id"),
            "name": r.get("name"),
            "type": r.get("resourceType", {}).get("id"),
            "zip": addr.get("postalCode"),
            "city": addr.get("city"),
            "state": addr.get("state"),
            "lat": r.get("latitude"),
            "lng": r.get("longitude"),
            "verified": r.get("isVerified"),
            "referrals": r.get("referralCount", 0),
            "reviews": r.get("reviewCount", 0),
            "avg_rating": r.get("averageRating"),
            "is_open_now": is_open_now(r),
            "next_open": get_next_occurrence(r),
            "tags": [t.get("id") for t in (r.get("tags") or [])],
            "occurrences_count": len(r.get("occurrences") or []),
        })
    return pd.DataFrame(rows)

def fetch_as_df(**kwargs):
    """Fetch all resources with given params and return as DataFrame."""
    resources = get_all_resources(**kwargs)
    return resources_to_df(resources)

# ── Utilities ─────────────────────────────────────────────────────────────────

def is_open_now(resource):
    now = datetime.now(timezone.utc)
    for occ in (resource.get("occurrences") or []):
        if occ.get("skippedAt"):
            continue
        try:
            start = datetime.fromisoformat(occ["startTime"].replace("Z", "+00:00"))
            end = datetime.fromisoformat(occ["endTime"].replace("Z", "+00:00"))
            if start <= now <= end:
                return True
        except Exception:
            pass
    return False

def get_next_occurrence(resource):
    now = datetime.now(timezone.utc)
    upcoming = []
    for occ in (resource.get("occurrences") or []):
        if occ.get("skippedAt"):
            continue
        try:
            start = datetime.fromisoformat(occ["startTime"].replace("Z", "+00:00"))
            if start > now:
                upcoming.append((start, occ))
        except Exception:
            pass
    if not upcoming:
        return None
    upcoming.sort(key=lambda x: x[0])
    return upcoming[0][1].get("startTime")

print("✓ Lemontree data layer loaded")
print(f"  Available: get_resources, get_all_resources, get_resource_by_id,")
print(f"             get_resources_near, get_resources_by_zip, get_resources_by_region,")
print(f"             search_resources, get_resources_open_today, get_map_markers,")
print(f"             resources_to_df, fetch_as_df, is_open_now, get_next_occurrence")
`;

// ─── Tools exposed to Claude ──────────────────────────────────────────────────

const TOOLS = [
  {
    name: "execute_python",
    description: `Run Python code in a persistent E2B sandbox.
The sandbox already has the full Lemontree data layer loaded — all fetch functions and DataFrame helpers are available.
Use this to fetch data, analyze it, and produce findings.
Stdout is returned. DataFrames printed with print(df) or df.to_string() are captured.
Files saved to /home/user/ persist across calls.`,
    input_schema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "Python code to execute",
        },
        reasoning: {
          type: "string",
          description: "Brief note on what this step is doing and why",
        },
      },
      required: ["code", "reasoning"],
    },
  },
  {
    name: "finish_analysis",
    description: "Call this when the analysis is complete. Provide a short plain-text answer.",
    input_schema: {
      type: "object",
      properties: {
        answer: {
          type: "string",
          description: "A few sentences summarizing the answer to the user's question",
        },
      },
      required: ["answer"],
    },
  },
];

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an autonomous data analyst specialized in food security resource data.

You have access to the Lemontree food helpline API through a set of Python functions pre-loaded in your sandbox environment. Your job is to complete the analysis task given to you by iteratively fetching data, exploring it, and producing insights.

## Available data functions (pre-loaded in sandbox):
- \`get_resources(**kwargs)\` — paginated resource fetch (zip, lat/lng, type, text search, etc.)
- \`get_all_resources(**kwargs)\` — auto-paginate to get everything matching params  
- \`get_resources_by_zip(zip_code)\` — resources near a zip
- \`get_resources_by_region(region)\` — resources in a region
- \`get_resources_near(lat, lng)\` — resources near coordinates
- \`search_resources(text)\` — full-text name search
- \`get_resources_open_today()\` — only resources open today
- \`get_map_markers(sw_lat, sw_lng, ne_lat, ne_lng)\` — lightweight map pins for bounding box
- \`fetch_as_df(**kwargs)\` — fetch + flatten to pandas DataFrame directly
- \`resources_to_df(resources)\` — convert a list to DataFrame
- \`is_open_now(resource)\` — bool
- \`get_next_occurrence(resource)\` — ISO datetime string

## Key resource fields (when flattened to DataFrame):
id, name, type (FOOD_PANTRY | SOUP_KITCHEN), zip, city, state, lat, lng,
verified, referrals, reviews, avg_rating, is_open_now, next_open, tags, occurrences_count

## Strategy:
1. Start with a small exploratory fetch to understand data shape
2. Decide what broader fetch is needed based on the job
3. Analyze, compute statistics, find patterns
4. Iterate — dig deeper on interesting findings
5. Call finish_analysis with a short plain-text answer (a few sentences)

Be thorough but efficient. Prefer fetch_as_df() for analysis work.
Always print intermediate results so you can see the data.
Save important DataFrames as CSV with df.to_csv('/home/user/output_name.csv', index=False).`;

// ─── Agent loop ───────────────────────────────────────────────────────────────

async function runAgent(job) {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log(`║  Autonomous Analysis Agent`);
  console.log(`║  Job: ${job.slice(0, 48)}${job.length > 48 ? "…" : ""}`);
  console.log("╚══════════════════════════════════════════════════════╝\n");

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Boot E2B sandbox
  console.log("⟳  Starting E2B sandbox...");
  let sandboxStart = Date.now();
  const sandbox = await Sandbox.create({ apiKey: process.env.E2B_API_KEY });
  dbg(`Sandbox created in ${Date.now() - sandboxStart}ms: ${sandbox.sandboxId}`);
  console.log(`✓  Sandbox ready: ${sandbox.sandboxId}\n`);

  // Install deps and inject data layer
  console.log("⟳  Installing Python deps...");
  let depStart = Date.now();
  const install = await sandbox.runCode(
    "import subprocess; subprocess.run(['pip', 'install', 'pandas', 'requests', '-q'])"
  );
  dbg(`Dependencies installed in ${Date.now() - depStart}ms`);
  console.log("✓  Dependencies ready");

  console.log("⟳  Loading Lemontree data layer...");
  let initStart = Date.now();
  const initResult = await sandbox.runCode(PYTHON_DATA_LAYER);
  dbg(`Data layer loaded in ${Date.now() - initStart}ms`);
  if (initResult.logs.stdout) console.log(initResult.logs.stdout.join("").trim());
  console.log("");

  // Conversation history
  const messages = [
    {
      role: "user",
      content: `Complete the following data analysis job:\n\n${job}\n\nUse the available data functions to fetch real data, analyze it, and produce concrete findings. Start with an exploratory fetch to understand what's available.`,
    },
  ];

  let iteration = 0;
  let finalReport = null;

  // ── Main agentic loop ──
  while (iteration < MAX_ITERATIONS) {
    iteration++;
    console.log(`\n${"─".repeat(56)}`);
    console.log(`  Iteration ${iteration}/${MAX_ITERATIONS}`);
    console.log(`${"─".repeat(56)}`);

    dbg(`Calling Claude API (model: ${MODEL}, messages: ${messages.length})`);
    dumpConversation(messages);

    const apiStart = Date.now();
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });
    dbg(`Claude API responded in ${Date.now() - apiStart}ms`);
    dbg(`Stop reason: ${response.stop_reason}, content blocks: ${response.content.length}`);
    dbg(`Tokens — input: ${response.usage?.input_tokens}, output: ${response.usage?.output_tokens}`);

    // Log response blocks
    dbg("Response content:");
    for (const block of response.content) {
      dumpBlock("  ASSISTANT", block);
    }

    // Add assistant turn to history
    messages.push({ role: "assistant", content: response.content });

    // Process content blocks
    const toolResults = [];

    for (const block of response.content) {
      if (block.type === "text" && block.text.trim()) {
        console.log("\n💭 Claude:", block.text.trim());
      }

      if (block.type === "tool_use") {
        if (block.name === "finish_analysis") {
          // ── Job complete ──
          finalReport = block.input;
          console.log("\n✅  Analysis complete!\n");

          // Still need to return tool result to close the loop cleanly
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: "Report recorded.",
          });
          break;
        }

        if (block.name === "execute_python") {
          const { code, reasoning } = block.input;
          console.log(`\n🔧 Executing: ${reasoning}`);
          console.log("   Code preview:", code.split("\n")[0].slice(0, 72) + "…");

          let execResult;
          const execStart = Date.now();
          try {
            execResult = await sandbox.runCode(code);
          } catch (err) {
            execResult = { logs: { stdout: [], stderr: [err.message] }, error: err };
          }
          dbg(`Sandbox execution took ${Date.now() - execStart}ms`);

          const stdout = (execResult.logs.stdout || []).join("").trim();
          const stderr = (execResult.logs.stderr || []).join("").trim();
          const errorMsg = execResult.error?.value || "";
          dbg(`Exec result — stdout: ${stdout.length} chars, stderr: ${stderr.length} chars, error: ${errorMsg ? "YES" : "none"}`);

          let output = "";
          if (stdout) output += stdout;
          if (stderr) output += `\nSTDERR:\n${stderr}`;
          if (errorMsg) output += `\nERROR:\n${errorMsg}`;
          if (!output) output = "(no output)";

          // Print sandbox output
          if (stdout) {
            const lines = stdout.split("\n").slice(0, 30);
            console.log("\n   Output:");
            lines.forEach((l) => console.log(`   │ ${l}`));
            if (stdout.split("\n").length > 30) console.log("   │ … (truncated)");
          }
          if (stderr || errorMsg) {
            console.log("\n   ⚠  Errors:", (stderr || errorMsg).split("\n")[0]);
          }

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: output.slice(0, 8000), // cap context window usage
          });
        }
      }
    }

    // If we have a final report, break out
    if (finalReport) {
      // Send final tool result then stop
      if (toolResults.length > 0) {
        messages.push({ role: "user", content: toolResults });
      }
      break;
    }

    // Return tool results to Claude
    if (toolResults.length > 0) {
      dbg(`Returning ${toolResults.length} tool result(s) to Claude`);
      messages.push({ role: "user", content: toolResults });
    }

    // If Claude stopped without tool use and no report, prompt it to continue
    if (response.stop_reason === "end_turn" && toolResults.length === 0) {
      dbg("Claude stopped without tool use or report — nudging to continue");
      console.log("\n⚠  Claude stopped without finishing. Prompting to continue...");
      messages.push({
        role: "user",
        content: "Continue the analysis. Use execute_python to fetch more data or call finish_analysis if you have enough findings.",
      });
    }

    dbg(`End of iteration ${iteration}, total messages: ${messages.length}`);
  }

  // ── Teardown ──
  await sandbox.kill();
  console.log("\n🗑  Sandbox closed");

  return finalReport;
}

// ─── Report printer ───────────────────────────────────────────────────────────

function printReport(report) {
  if (!report) {
    console.log("\n⚠  No report generated (max iterations reached)");
    return;
  }

  console.log(`\n${"═".repeat(56)}`);
  console.log(report.answer);
  console.log(`${"═".repeat(56)}\n`);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let job = args.join(" ").replace(/^--job\s+/, "").trim();

if (!job) {
  // Default demo job
  job = "Find average longitude and latitude of the resources in zip code 10001.";
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("❌  ANTHROPIC_API_KEY is not set");
  process.exit(1);
}
if (!process.env.E2B_API_KEY) {
  console.error("❌  E2B_API_KEY is not set");
  process.exit(1);
}

const report = await runAgent(job);
printReport(report);
