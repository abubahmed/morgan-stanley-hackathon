import dotenv from "dotenv";
import { runAgent } from "./agent";

dotenv.config({ path: ".env.local" });

const job =
  process.argv.slice(2).join(" ").replace(/^--job\s+/, "").trim() ||
  "Compare the average poverty rate of New York counties that have Lemontree food pantries vs New York counties that don't. Show a bar chart.";

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
    process.exit(1);
  }

  console.log(`\nResult:\n${report.answer}`);
  console.log(`\n${report.images.length} chart(s) generated.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
