import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

const DATA_DIR = path.join(process.cwd(), "data");

// NYC boroughs + Yonkers (Westchester) + Jersey City (Hudson)
const COUNTIES: Record<string, string> = {
  "36005": "Bronx",
  "36047": "Brooklyn",
  "36061": "Manhattan",
  "36081": "Queens",
  "36085": "Staten Island",
  "36119": "Westchester",
  "34017": "Hudson",
};

function parseCsv(filePath: string): Record<string, string>[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  const result = Papa.parse<Record<string, string>>(raw, { header: true, skipEmptyLines: true });
  return result.data;
}

export async function GET() {
  const crosswalk = parseCsv(path.join(DATA_DIR, "crosswalk", "zip_county.csv"));
  const resources = parseCsv(path.join(DATA_DIR, "resources", "resources.csv"));

  // Build zip -> fips lookup, only for our target counties
  const targetFips = new Set(Object.keys(COUNTIES));
  const zipToFips = new Map<string, string>();
  for (const row of crosswalk) {
    if (targetFips.has(row.fips)) {
      zipToFips.set(row.zip_code, row.fips);
    }
  }

  // Count resources per county
  const counts: Record<string, number> = {};
  for (const fips of targetFips) counts[fips] = 0;

  for (const r of resources) {
    const zip = (r.zip_code ?? "").trim();
    if (!zip) continue;
    const fips = zipToFips.get(zip);
    if (fips) counts[fips]++;
  }

  const result = Object.entries(COUNTIES).map(([fips, area]) => ({
    area,
    fips,
    resources: counts[fips] ?? 0,
  }));

  return NextResponse.json(result);
}
