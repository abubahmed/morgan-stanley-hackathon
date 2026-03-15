import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { getAllResources } from "./lemontree_api";
import type { LemontreeAggregate } from "@/types/insights";
import type { Resource } from "@/types/resource";

const ZIP_TO_COUNTY_PATH = join(process.cwd(), "data", "geo", "zip-to-county-us.json");
const LEMONTREE_COUNTY_CACHE_PATH = join(process.cwd(), "data", "public", "lemontree-county.json");

let zipToCounty: Record<string, string> | null = null;

export interface LemontreeCountyRow {
  year: number;
  county_fips: string;
  num_pantries: number;
  num_with_fresh_produce: number;
  num_with_meat: number;
  avg_wait_time_min: number | null;
  sample_resource_ids: string[];
}

export function getZipToCounty(): Record<string, string> {
  if (zipToCounty) return zipToCounty;
  if (!existsSync(ZIP_TO_COUNTY_PATH)) {
    zipToCounty = {};
    return zipToCounty;
  }
  zipToCounty = JSON.parse(readFileSync(ZIP_TO_COUNTY_PATH, "utf-8")) as Record<string, string>;
  return zipToCounty;
}

function normalizeZip(zip: string | null | undefined): string | null {
  if (!zip) return null;
  const digits = zip.trim();
  if (!digits) return null;
  // Ensure 5-digit ZIP; keep as-is if already 5+ digits.
  return digits.padStart(5, "0").slice(0, 5);
}

export function aggregateResourcesByCounty(resources: Resource[], year: number): LemontreeCountyRow[] {
  const zipToCountyMap = getZipToCounty();
  const byCounty = new Map<string, { ids: string[]; waitTimes: number[]; fresh: number; meat: number }>();

  for (const r of resources) {
    const zip = normalizeZip(r.zipCode);
    if (!zip) continue;
    const county_fips = zipToCountyMap[zip];
    if (!county_fips) continue;

    let agg = byCounty.get(county_fips);
    if (!agg) {
      agg = { ids: [], waitTimes: [], fresh: 0, meat: 0 };
      byCounty.set(county_fips, agg);
    }
    agg.ids.push(r.id);
    if (typeof r.waitTimeMinutesAverage === "number" && Number.isFinite(r.waitTimeMinutesAverage)) {
      agg.waitTimes.push(r.waitTimeMinutesAverage);
    }
    const tags = r.tags ?? [];
    const hasTag = (name: string) => tags.some((t) => t.name?.toLowerCase().includes(name));
    if (hasTag("produce") || hasTag("vegetable") || hasTag("fruit")) agg.fresh += 1;
    if (hasTag("meat")) agg.meat += 1;
  }

  const rows: LemontreeCountyRow[] = [];
  for (const [county_fips, agg] of byCounty.entries()) {
    const waitTimes = agg.waitTimes.filter(Number.isFinite);
    const avg_wait_time_min =
      waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : null;
    rows.push({
      year,
      county_fips,
      num_pantries: agg.ids.length,
      num_with_fresh_produce: agg.fresh,
      num_with_meat: agg.meat,
      avg_wait_time_min,
      sample_resource_ids: agg.ids.slice(0, 10),
    });
  }
  return rows;
}

export async function buildLemontreeCountyRowsFromApi(year: number): Promise<LemontreeCountyRow[]> {
  const resources = (await getAllResources({})) as Resource[];
  return aggregateResourcesByCounty(resources, year);
}

export function readLemontreeCountyCache(): LemontreeCountyRow[] | null {
  if (!existsSync(LEMONTREE_COUNTY_CACHE_PATH)) return null;
  try {
    const raw = readFileSync(LEMONTREE_COUNTY_CACHE_PATH, "utf-8");
    return JSON.parse(raw) as LemontreeCountyRow[];
  } catch {
    return null;
  }
}

export function writeLemontreeCountyCache(rows: LemontreeCountyRow[]): void {
  const dir = join(process.cwd(), "data", "public");
  mkdirSync(dir, { recursive: true });
  writeFileSync(LEMONTREE_COUNTY_CACHE_PATH, JSON.stringify(rows, null, 0), "utf-8");
}

export function getLemontreeByCountyFromCache(): Map<string, LemontreeAggregate> {
  const rows = readLemontreeCountyCache();
  const map = new Map<string, LemontreeAggregate>();
  if (!rows?.length) return map;
  for (const r of rows) {
    map.set(r.county_fips, {
      num_pantries: r.num_pantries,
      num_with_fresh_produce: r.num_with_fresh_produce,
      num_with_meat: r.num_with_meat,
      avg_wait_time_min: r.avg_wait_time_min,
      sample_resource_ids: r.sample_resource_ids,
    });
  }
  return map;
}

