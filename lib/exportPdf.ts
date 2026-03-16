import type { AnalysisResult } from "@/types/chat";

export async function exportReportPdf(result: AnalysisResult, reportNumber: number) {
  const { default: jsPDF } = await import("jspdf");

  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Title
  pdf.setFontSize(16);
  pdf.setTextColor(30, 45, 61);
  pdf.text(`Analysis Report ${reportNumber}`, margin, y);
  y += 10;

  // Separator line
  pdf.setDrawColor(210, 195, 165);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Answer text
  pdf.setFontSize(11);
  pdf.setTextColor(58, 80, 96);
  const lines = pdf.splitTextToSize(result.answer, contentWidth);

  for (const line of lines) {
    if (y > 280) {
      pdf.addPage();
      y = margin;
    }
    pdf.text(line, margin, y);
    y += 5.5;
  }

  // Images
  for (const img of result.images) {
    if (y > 200) {
      pdf.addPage();
      y = margin;
    } else {
      y += 8;
    }

    try {
      const imgData = `data:image/png;base64,${img}`;
      pdf.addImage(imgData, "PNG", margin, y, contentWidth, contentWidth * 0.6);
      y += contentWidth * 0.6 + 8;
    } catch {
      // skip images that fail to embed
    }
  }

  pdf.save(`report-${reportNumber}.pdf`);
}
