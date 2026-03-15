/**
 * Ingest Lemontree resources nationally and aggregate by county_fips.
 * Run: npm run ingest-lemontree
 *
 * This script requires:
 * - A ZIP→county crosswalk at data/geo/zip-to-county-us.json
 * - Lemontree API reachable from lib/lemontree_api.ts
 */
import dotenv from "dotenv";
import { join } from "path";
dotenv.config({ path: join(process.cwd(), ".env.local") });
dotenv.config({ path: join(process.cwd(), "..", ".env.local") });

import { buildLemontreeCountyRowsFromApi, writeLemontreeCountyCache, getZipToCounty } from "../lib/lemontree_aggregate";

async function main() {
  const zipToCounty = getZipToCounty();
  if (Object.keys(zipToCounty).length === 0) {
    console.warn(
      "Warning: data/geo/zip-to-county-us.json is empty or missing; Lemontree county aggregation will be empty."
    );
  }

  const year = new Date().getFullYear();
  console.log(`Building Lemontree county aggregates for year ${year}...`);
  try {
    const rows = await buildLemontreeCountyRowsFromApi(year);
    writeLemontreeCountyCache(rows);
    console.log(`Wrote ${rows.length} rows to data/public/lemontree-county.json`);
  } catch (err) {
    console.error("ERROR ingesting Lemontree county data:", err);
    process.exit(1);
  }
}

main();

