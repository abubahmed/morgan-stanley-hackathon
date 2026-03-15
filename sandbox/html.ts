import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { runAgent } from "./agent";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

function generateReport(job: string, answer: string, images: string[]): string {
  const imageHtml = images
    .map(
      (img) =>
        `<img src="data:image/png;base64,${img}" />`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 0 auto; padding: 40px 20px; background: #fafafa; color: #1a1a1a; line-height: 1.6; font-size: 15px; }
    .job { font-style: italic; color: #555; margin-bottom: 24px; }
    .content { white-space: pre-wrap; }
    img { display: block; max-width: 100%; margin: 24px auto; border: 1px solid #e0e0e0; border-radius: 4px; }
  </style>
</head>
<body>
  <p class="job">${job.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
  <div class="content">${answer.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
${imageHtml}
</body>
</html>`;
}

async function main() {
  const report = await runAgent(job);

  if (!report) {
    console.log("\nNo report generated (max iterations reached).");
    process.exit(1);
  }

  console.log(`\nResult:\n${report.answer}\n`);

  // Generate HTML report
  const reportsDir = path.join(__dirname, "..", "reports");
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const html = generateReport(job, report.answer, report.images);
  const outPath = path.join(reportsDir, `report-${timestamp}.html`);
  fs.writeFileSync(outPath, html, "utf-8");
  console.log(`${report.images.length} chart(s) embedded.`);
  console.log(`Report saved to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
