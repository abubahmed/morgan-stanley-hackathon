import { db } from "./db";
import { reviews } from "./schema";

async function main() {
  const deleted = await db.delete(reviews);
  console.log("Cleared all reviews from DB");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
