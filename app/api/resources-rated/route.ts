import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

const DATA_DIR = path.join(process.cwd(), "data");

function parseCsv(filePath: string): Record<string, string>[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  return Papa.parse<Record<string, string>>(raw, { header: true, skipEmptyLines: true }).data;
}

export async function GET(req: NextRequest) {
  const zip = req.nextUrl.searchParams.get("zip")?.trim();
  if (!zip) {
    return NextResponse.json({ error: "Missing zip query parameter" }, { status: 400 });
  }

  const resources = parseCsv(path.join(DATA_DIR, "resources", "resources.csv"));

  const results = resources
    .filter((r) => (r.zip_code ?? "").trim() === zip)
    .map((r) => ({
      name: (r.name ?? "").trim(),
      rating: parseFloat(r.rating_average ?? ""),
      waitTime: parseFloat(r.wait_time_minutes_average ?? ""),
    }))
    .filter((r) => r.name && !isNaN(r.rating) && r.rating > 0)
    .sort((a, b) => b.rating - a.rating);

  return NextResponse.json(results);
}
