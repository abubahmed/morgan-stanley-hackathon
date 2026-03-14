/**
 * Verify that public datasets are correctly gathered and merged.
 * Run after: npm run ingest-public
 * Optional: with dev server running, set VERIFY_API=1 to also check GET /api/insights.
 *
 * Usage: npx tsx scripts/verify-public-data.ts
 *        VERIFY_API=1 npx tsx scripts/verify-public-data.ts
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getEnabledDatasets } from "../lib/public-datasets";
import { getCachePath } from "../lib/public-datasets";

const DATA_DIR = join(process.cwd(), "data", "public");

/** Expected indicator keys by dataset (subset of schemaMapping + year/geo keys) */
const EXPECTED_KEYS: Record<string, string[]> = {
  "nyc-food-insecurity": [
    "year",
    "local_area_code",
    "local_area_name",
    "city_code",
    "food_insecure_pct",
    "weighted_score",
    "supply_gap_lbs",
    "vulnerable_pop",
    "rank",
    "unemployment_rate",
  ],
  "census-acs5-county": ["year", "county_fips", "population", "poverty_count", "poverty_total"],
  "bls-laus-county": ["year", "county_fips", "unemployment_rate"],
  "usda-fara-2019": ["year", "county_fips", "low_access_share"],
};

async function main() {
  const datasets = getEnabledDatasets();
  let ok = true;

  console.log("=== Public data verification ===\n");

  // 1. Cache files
  console.log("1. Cache files (data/public/*.json)");
  for (const config of datasets) {
    const path = getCachePath(config.id);
    const exists = existsSync(path);
    if (!exists) {
      console.log(`   ❌ ${config.id}: file missing (run: npm run ingest-public)`);
      ok = false;
      continue;
    }
    let rows: unknown[];
    try {
      const raw = readFileSync(path, "utf-8");
      rows = JSON.parse(raw) as unknown[];
    } catch (e) {
      console.log(`   ❌ ${config.id}: invalid JSON - ${e}`);
      ok = false;
      continue;
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      console.log(`   ❌ ${config.id}: empty or not an array`);
      ok = false;
      continue;
    }
    const expected = EXPECTED_KEYS[config.id];
    const first = rows[0] as Record<string, unknown>;
    const missing = expected?.filter((k) => !(k in first)) ?? [];
    if (missing.length > 0) {
      console.log(`   ❌ ${config.id}: missing keys in row: ${missing.join(", ")}`);
      ok = false;
    } else {
      console.log(`   ✓ ${config.id}: ${rows.length} rows, expected keys present`);
    }
  }

  // 1b. Lemontree county cache (optional; for national geo=county insights)
  const lemontreeCountyPath = join(DATA_DIR, "lemontree-county.json");
  if (existsSync(lemontreeCountyPath)) {
    try {
      const raw = readFileSync(lemontreeCountyPath, "utf-8");
      const rows = JSON.parse(raw) as { county_fips: string; num_pantries: number }[];
      const arr = Array.isArray(rows) ? rows : [];
      const withPantries = arr.filter((r) => r.num_pantries > 0).length;
      console.log(`   ✓ lemontree-county: ${arr.length} counties, ${withPantries} with pantries`);
    } catch {
      console.log("   ⚠ lemontree-county.json invalid or empty");
    }
  } else {
    console.log("   ⚠ lemontree-county.json missing (run: npm run ingest-lemontree for national Lemontree)");
  }

  // 2. Optional: insights API
  const baseUrl = process.env.VERIFY_API ? process.env.VERIFY_API_BASE ?? "http://localhost:3000" : "";
  if (baseUrl) {
    console.log("\n2. Insights API (merged layers)");
    try {
      const url = `${baseUrl}/api/insights?city=nyc&year=2025&limit=3`;
      const res = await fetch(url);
      const d = (await res.json()) as {
        areas?: Array<{ geo?: { local_area_code: string }; public?: Record<string, unknown> }>;
        sources?: { publicDatasetIds?: string[] };
      };
      const areas = d?.areas ?? [];
      const ids = d?.sources?.publicDatasetIds ?? [];
      if (areas.length === 0) {
        console.log("   ⚠ No areas returned (check city/year or NTA cache)");
      } else {
        const firstArea = areas[0];
        const pub = firstArea?.public ?? {};
        const hasNyc = "weighted_score" in pub && pub.weighted_score != null;
        const hasCounty =
          ("population" in pub && pub.population != null) ||
          ("unemployment_rate" in pub && pub.unemployment_rate != null) ||
          ("low_access_share" in pub && pub.low_access_share != null);
        const anyHasNyc = areas.some((a) => a.public?.weighted_score != null);
        if (!anyHasNyc) {
          console.log("   ⚠ No area with NYC weighted_score (NTA food insecurity may be empty for this year)");
        } else if (!hasNyc) {
          console.log(`   ✓ NYC layer present in some areas (first area may be borough-level)`);
        } else {
          console.log(`   ✓ NYC layer present (e.g. weighted_score: ${pub.weighted_score})`);
        }
        if (ids.includes("census-acs5-county") || ids.includes("bls-laus-county") || ids.includes("usda-fara-2019")) {
          if (hasCounty) {
            console.log(`   ✓ County layer(s) present (population/unemployment/low_access_share)`);
          } else {
            console.log("   ⚠ County datasets enabled but no county fields in first area (check cache + year)");
          }
        }
        console.log(`   Sources: ${ids.join(", ")}`);
      }
      // County (national) mode: public + Lemontree
      const countyUrl = `${baseUrl}/api/insights?geo=county&year=2022&limit=100`;
      const countyRes = await fetch(countyUrl);
      const countyData = (await countyRes.json()) as {
        areas?: Array<{ geo?: { local_area_code: string }; public?: Record<string, unknown>; lemontree?: { num_pantries: number } }>;
        sources?: { lemontree?: boolean; publicDatasetIds?: string[] };
      };
      const countyAreas = countyData?.areas ?? [];
      const withLt = countyAreas.filter((a) => (a.lemontree?.num_pantries ?? 0) > 0).length;
      if (countyAreas.length > 0) {
        const hasPublic = (countyAreas[0].public?.population != null) || (countyAreas[0].public?.unemployment_rate != null);
        if (hasPublic) console.log(`   ✓ County mode: ${countyAreas.length} areas, public indicators present`);
        if (countyData?.sources?.lemontree && withLt > 0) {
          console.log(`   ✓ County mode: Lemontree data present (${withLt} areas with pantries)`);
        } else if (withLt === 0 && countyAreas.length > 0) {
          console.log("   ⚠ County mode: no areas with lemontree pantries (run: npm run ingest-lemontree)");
        }
      }
    } catch (e) {
      console.log(`   ❌ API request failed: ${e}`);
      ok = false;
    }
  } else {
    console.log("\n2. Insights API (skipped; set VERIFY_API=1 and start dev server to verify merge)");
  }

  console.log("\n=== " + (ok ? "Verification passed" : "Some checks failed") + " ===\n");
  process.exit(ok ? 0 : 1);
}

main();
