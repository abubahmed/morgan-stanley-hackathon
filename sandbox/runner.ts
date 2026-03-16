import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import { runAgent } from "./agent";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: ".env.local" });

// Set to true to generate a PDF report in reports/
const GENERATE_PDF = true;

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

function generatePDF(outPath: string, job: string, answer: string, images: string[]) {
  return new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);

    // Job question
    doc.font("Helvetica-Oblique").fontSize(11).fillColor("#555555").text(job, { lineGap: 4 });
    doc.moveDown(1);

    // Answer text
    doc.font("Helvetica").fontSize(11).fillColor("#1a1a1a").text(answer, { lineGap: 3 });
    doc.moveDown(1);

    // Images
    for (const b64 of images) {
      const imgBuffer = Buffer.from(b64, "base64");

      // Check if we need a new page for the image
      if (doc.y > doc.page.height - 250) {
        doc.addPage();
      }

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      doc.image(imgBuffer, { fit: [pageWidth, 400], align: "center" });
      doc.moveDown(1);
    }

    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

async function main() {
  const report = await runAgent(job);

  if (!report) {
    console.log("\nNo report generated (max iterations reached).");
    process.exit(1);
  }

  console.log(`\nResult:\n${report.answer}\n`);

  if (GENERATE_PDF) {
    const reportsDir = path.join(__dirname, "..", "reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const outPath = path.join(reportsDir, `report-${timestamp}.pdf`);

    await generatePDF(outPath, job, report.answer, report.images);
    console.log(`${report.images.length} chart(s) embedded.`);
    console.log(`Report saved to ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
