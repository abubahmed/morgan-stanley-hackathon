import type { AnalysisResult } from "@/types/chat";

export async function exportReportPdf(result: AnalysisResult, reportNumber: number) {
  const { default: jsPDF } = await import("jspdf");

  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function checkPage(needed: number) {
    if (y + needed > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  }

  // Title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(30, 45, 61);
  pdf.text(`Analysis Report ${reportNumber}`, margin, y);
  y += 8;

  // Separator
  pdf.setDrawColor(210, 195, 165);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Answer text
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(58, 80, 96);

  const paragraphs = result.answer.split(/\n/);
  for (const para of paragraphs) {
    if (para.trim() === "") {
      y += 4;
      continue;
    }
    const lines = pdf.splitTextToSize(para, contentWidth) as string[];
    for (const line of lines) {
      checkPage(5);
      pdf.text(line, margin, y);
      y += 5;
    }
    y += 2;
  }

  // Images — fetch from URL and insert into PDF
  for (const imgSrc of result.images) {
    try {
      const dataUrl = await loadImageAsDataUrl(imgSrc);
      const imgDims = await getImageDimensions(imgSrc);
      const ratio = imgDims.width / imgDims.height;
      const imgWidth = Math.min(contentWidth, 170);
      const imgHeight = imgWidth / ratio;

      checkPage(imgHeight + 5);

      pdf.addImage(
        dataUrl,
        "PNG",
        margin,
        y,
        imgWidth,
        imgHeight,
        undefined,
        "FAST"
      );
      y += imgHeight + 8;
    } catch {
      // skip broken images
    }
  }

  pdf.save(`report-${reportNumber}.pdf`);
}

function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = src;
  });
}

function loadImageAsDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = src;
  });
}
