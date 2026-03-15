import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { runAgent } from "./agent";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: ".env.local" });

const job =
  process.argv.slice(2).join(" ").replace(/^--job\s+/, "").trim() ||
  "Plot SNAP participation rate vs poverty rate across counties using the latest census year.";

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
      (img, i) =>
        `<div class="image"><img src="data:image/png;base64,${img}" alt="Chart ${i + 1}" /><p>Figure ${i + 1}</p></div>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Analysis Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 0 auto; padding: 40px 20px; background: #fafafa; color: #1a1a1a; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    .meta { color: #666; font-size: 14px; margin-bottom: 32px; }
    .section { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px; margin-bottom: 24px; }
    .section h2 { font-size: 16px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
    .job { font-style: italic; color: #444; }
    .answer { white-space: pre-wrap; line-height: 1.6; font-size: 15px; }
    .image { text-align: center; margin: 20px 0; }
    .image img { max-width: 100%; border: 1px solid #e0e0e0; border-radius: 4px; }
    .image p { color: #888; font-size: 13px; margin-top: 8px; }
    .no-images { color: #999; font-style: italic; }
  </style>
</head>
<body>
  <h1>Analysis Report</h1>
  <p class="meta">${new Date().toLocaleString()}</p>

  <div class="section">
    <h2>Job</h2>
    <p class="job">${job.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
  </div>

  <div class="section">
    <h2>Answer</h2>
    <div class="answer">${answer.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
  </div>

  <div class="section">
    <h2>Charts (${images.length})</h2>
    ${images.length ? imageHtml : '<p class="no-images">No charts generated.</p>'}
  </div>
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
  const html = generateReport(job, report.answer, report.images);
  const outPath = path.join(__dirname, "..", "report.html");
  fs.writeFileSync(outPath, html, "utf-8");
  console.log(`${report.images.length} chart(s) embedded.`);
  console.log(`Report saved to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
