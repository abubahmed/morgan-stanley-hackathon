import dotenv from "dotenv";
import { runAgent } from "./agent";

dotenv.config({ path: ".env.local" });

// Example prompts that exercise different capabilities of the agent:
const EXAMPLE_JOBS = [
  // Simple lookup — tests basic filtering and aggregation
  "Find all food pantries in zip code 10001. How many are there, and what's the average confidence score?",

  // Geographic analysis — tests coordinate math and distance calculations
  "Which 5 soup kitchens are closest to Times Square (40.7580, -73.9855)? List them with distances in miles.",

  // Temporal filtering — tests date-based queries and schedule parsing
  "How many resources are open this week vs. total resources in New York City? What percentage are active?",

  // Comparative analysis — tests grouping, aggregation, and cross-category comparison
  "Compare food pantries vs soup kitchens across all data: which type has more resources, higher average review counts, and higher confidence scores?",

  // Multi-step exploration — tests iterative deepening and pattern finding
  "Find the top 10 zip codes with the most food resources. For each, report the count, average confidence, and whether they tend to be pantries or kitchens.",
];

const job =
  process.argv.slice(2).join(" ").replace(/^--job\s+/, "").trim() ||
  EXAMPLE_JOBS[4];

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set");
  process.exit(1);
}
if (!process.env.E2B_API_KEY) {
  console.error("E2B_API_KEY is not set");
  process.exit(1);
}

async function main() {
  const report = await runAgent(job);

  if (!report) {
    console.log("\nNo report generated (max iterations reached).");
  } else {
    console.log(`\nResult:\n${report.answer}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
