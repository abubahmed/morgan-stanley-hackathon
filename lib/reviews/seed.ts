import { db } from "./db";
import { reviews } from "./schema";
import { generateReviews } from "./generate";
import { getResources } from "../lemontree_api";

const NUM_RESOURCES = 200;
const REVIEWS_PER_RESOURCE = 30;

async function main() {
  console.log("Fetching resources from Lemontree API...");
  const res = await getResources({ take: NUM_RESOURCES });

  const resourceOccurrences: Record<string, string[]> = {};

  for (const r of res.resources) {
    resourceOccurrences[r.id] = (r.occurrences ?? []).map((o: any) => o.id);
  }

  const resourceCount = Object.keys(resourceOccurrences).length;
  const occurrenceCount = Object.values(resourceOccurrences).flat().length;
  console.log(`Found ${resourceCount} resources, ${occurrenceCount} occurrences`);
  console.log(`Generating ${REVIEWS_PER_RESOURCE} reviews per resource...`);

  const generated = generateReviews(resourceOccurrences, REVIEWS_PER_RESOURCE);
  console.log(`Generated ${generated.length} reviews, inserting into DB...`);

  for (let i = 0; i < generated.length; i += 100) {
    const batch = generated.slice(i, i + 100).map((r) => ({
      ...r,
      createdAt: new Date(r.createdAt),
      deletedAt: null,
    }));
    await db.insert(reviews).values(batch);
    console.log(`  Inserted ${Math.min(i + 100, generated.length)}/${generated.length}`);
  }

  console.log("Done!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
