import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data", "public");

export interface CachedDatasetRow {
  year: number;
  local_area_code?: string;
  local_area_name?: string;
  city_code?: string;
  /**
   * County FIPS: 5-digit code (2-digit state + 3-digit county) used to join county-level data.
   * NYC boroughs: 36005=Bronx, 36047=Kings, 36061=New York, 36081=Queens, 36085=Richmond.
   */
  county_fips?: string;
  [key: string]: unknown;
}

export function getCachePath(datasetId: string): string {
  return join(DATA_DIR, `${datasetId}.json`);
}

export function readCached(datasetId: string): CachedDatasetRow[] | null {
  const path = getCachePath(datasetId);
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as CachedDatasetRow[];
  } catch {
    return null;
  }
}

export function writeCached(datasetId: string, rows: CachedDatasetRow[]): void {
  mkdirSync(DATA_DIR, { recursive: true });
  const path = getCachePath(datasetId);
  writeFileSync(path, JSON.stringify(rows, null, 0), "utf-8");
}
