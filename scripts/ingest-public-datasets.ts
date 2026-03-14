/**
 * Ingest all enabled public datasets and write to data/public/.
 * Run: npm run ingest-public
 * Loads .env.local for CENSUS_API_KEY, BLS_API_KEY, and optionally USDA_API_KEY.
 * Datasets: NYC food insecurity, Census ACS5, BLS LAUS, USDA Food Environment Atlas, USDA Food Access Research Atlas.
 */
import dotenv from "dotenv";
import { join } from "path";
// Load .env.local from app dir or workspace root (so keys in parent .env.local work)
dotenv.config({ path: join(process.cwd(), ".env.local") });
dotenv.config({ path: join(process.cwd(), "..", ".env.local") });
import { getEnabledDatasets, fetchAndNormalize, writeCached } from "../lib/public-datasets";

async function main() {
  const datasets = getEnabledDatasets();
  console.log(`Ingesting ${datasets.length} enabled dataset(s)...`);

  for (const config of datasets) {
    try {
      console.log(`  Fetching ${config.id} (${config.name})...`);
      const rows = await fetchAndNormalize(config);
      writeCached(config.id, rows);
      console.log(`  Wrote ${rows.length} rows to data/public/${config.id}.json`);
    } catch (err) {
      console.error(`  ERROR ${config.id}:`, err);
    }
  }

  console.log("Done.");
}

main();
