import { getReviewsForResource } from "../lib/reviews";

const reviews = getReviewsForResource("test-resource-123", 5);

console.log(`Generated ${reviews.length} reviews:\n`);
for (const r of reviews) {
  console.log(`[${r.rating}/5] ${r.attended ? "Attended" : "Did not attend"} — ${r.text ?? "(no text)"}`);
  if (!r.attended) console.log(`  Reason: ${r.didNotAttendReason}`);
  if (r.waitTimeMinutes != null) console.log(`  Wait: ${r.waitTimeMinutes} min`);
  console.log(`  Date: ${r.createdAt}\n`);
  console.log(JSON.stringify(r, null, 2));
}
