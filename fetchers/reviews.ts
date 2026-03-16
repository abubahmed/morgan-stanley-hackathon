import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TOTAL_REVIEWS = 3000;
const DAYS_BACK = 365 * 3; // 3 years of reviews
const OUTPUT_PATH = path.join(__dirname, "..", "sandbox", "data", "reviews", "reviews.csv");

const POSITIVE_TEXTS = [
  "Amazing variety of fresh produce today. The volunteers were incredibly kind and welcoming.",
  "Really impressed with the selection. Got fresh vegetables, bread, and canned goods. Will definitely return.",
  "Staff were so helpful and respectful. No judgment, just genuine kindness. Thank you.",
  "Wonderful experience. They had meat, dairy, and fresh fruit. More than I expected.",
  "The volunteers remembered me from last time. Such a warm community here.",
  "Very organized and efficient. Was in and out in 15 minutes with a full bag.",
  "Fresh bread and vegetables today. Everything was clean and well presented.",
  "They had halal options available which was so important for my family.",
  "Great experience for the third time in a row. Consistently excellent.",
  "The staff speak Spanish which made everything so much easier for my mother.",
  "Huge variety today including fresh eggs and dairy. Really helped my family this week.",
  "Friendly atmosphere and no excessive paperwork. Felt like a real community.",
  "They gave us enough food for the whole week. Cannot thank them enough.",
  "Well stocked today. Fresh produce, frozen meat, and pantry staples all available.",
  "The new volunteer coordinator has made a big improvement. Much smoother process.",
];

const NEUTRAL_TEXTS = [
  "Decent selection but ran out of bread by the time I got there.",
  "Wait was longer than usual today, about 45 minutes. Staff were apologetic.",
  "Got some basics but selection was more limited than previous visits.",
  "Fine experience overall. Nothing special but nothing bad either.",
  "They were low on fresh produce but had plenty of canned goods.",
  "Mixed visit. Long line but staff were friendly once inside.",
  "Okay selection today. Hoping for more variety next time.",
  "The hours changed recently and weren't updated online. Worth calling ahead.",
  "Smaller portions than last month but still grateful for what was available.",
  "Average visit. Got what I needed but the process felt rushed.",
  "Some items were expired which was disappointing. Staff replaced them quickly.",
  "Limited parking made it difficult but the pantry itself was well run.",
  "Good but the distribution area felt cramped with so many people.",
  "Inconsistent — great last week, limited this week. Hard to plan around.",
  "Staff seemed short-handed today which slowed things down.",
];

const NEGATIVE_TEXTS = [
  "Arrived at 10am and was told they were already out of food. Very disappointing.",
  "The listing says open until 2pm but they closed at noon. Wasted my trip.",
  "Waited over an hour only to be told they couldn't help me without an ID I didn't know I needed.",
  "Hours on the website are completely wrong. Please update them.",
  "The address listed is different from the actual location. Took me 30 minutes to find.",
  "Staff were dismissive and made me feel unwelcome. Will not be returning.",
  "They turned me away because I live outside their zip code. Felt dehumanizing.",
  "Very limited selection today — only canned beans and rice. Barely worth the trip.",
  "Closed when I arrived despite being listed as open. Third time this has happened.",
  "Long wait, rude volunteer, and barely any food left. Extremely frustrating.",
  "The phone number listed doesn't work. Had no way to check if they were open.",
  "Location has moved but the listing hasn't been updated. Showed up at an empty building.",
  "Not enough staff for the number of people waiting. Chaotic and disorganized.",
  "Turned away after waiting 90 minutes. No explanation given.",
  "Food was past its use-by date. Health concern that should be addressed.",
];

const DID_NOT_ATTEND_REASONS = [
  "Location was closed when I arrived",
  "Arrived too late, they had stopped distributing",
  "Too far to travel without transportation",
  "Ran out of food before I reached the front",
  "Did not have required ID documentation",
  "Outside of their service zip code area",
  "Could not find the location — address was incorrect",
  "No childcare available and could not bring children inside",
  "Wait time was too long, had to leave for work",
  "They only serve specific days and listing was wrong",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(): string {
  const now = Date.now();
  const offset =
    randInt(0, DAYS_BACK) * 86400000 +
    randInt(0, 23) * 3600000 +
    randInt(0, 59) * 60000;
  return new Date(now - offset).toISOString().replace(/\.\d{3}Z$/, ".000Z");
}

function escapeCSV(val: string | null): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

interface Review {
  id: string;
  created_at: string;
  attended: boolean;
  did_not_attend_reason: string;
  rating: number;
  text: string;
  wait_time_minutes: string;
  information_accurate: boolean;
}

function generateReview(): Review {
  const outcomeRoll = Math.random();

  let attended: boolean;
  let rating: number;
  let text: string | null;
  let wait: number | null;
  let infoAccurate: boolean;

  if (outcomeRoll < 0.6) {
    attended = true;
    rating = weightedPick([5, 4, 3], [50, 35, 15]);
    text = pick(POSITIVE_TEXTS);
    wait = randInt(5, 30);
    infoAccurate = Math.random() > 0.05;
  } else if (outcomeRoll < 0.85) {
    attended = true;
    rating = weightedPick([3, 2], [60, 40]);
    text = pick(NEUTRAL_TEXTS);
    wait = randInt(20, 75);
    infoAccurate = Math.random() > 0.2;
  } else {
    attended = Math.random() > 0.4;
    rating = weightedPick([2, 1], [40, 60]);
    text = pick(NEGATIVE_TEXTS);
    wait = attended ? randInt(0, 90) : null;
    infoAccurate = Math.random() > 0.55;
  }

  // 10% chance of no text
  if (Math.random() < 0.1) text = null;

  return {
    id: randomUUID(),
    created_at: randomDate(),
    attended,
    did_not_attend_reason: !attended ? pick(DID_NOT_ATTEND_REASONS) : "",
    rating,
    text: text || "",
    wait_time_minutes: wait !== null ? String(wait) : "",
    information_accurate: infoAccurate,
  };
}

function main() {
  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const headers = [
    "id", "created_at", "attended", "did_not_attend_reason",
    "rating", "text", "wait_time_minutes", "information_accurate",
  ];

  const rows: string[] = [headers.join(",")];

  for (let i = 0; i < TOTAL_REVIEWS; i++) {
    const r = generateReview();
    rows.push([
      r.id,
      r.created_at,
      String(r.attended),
      escapeCSV(r.did_not_attend_reason),
      String(r.rating),
      escapeCSV(r.text),
      r.wait_time_minutes,
      String(r.information_accurate),
    ].join(","));
  }

  fs.writeFileSync(OUTPUT_PATH, rows.join("\n"), "utf-8");
  const sizeKB = Math.round(fs.statSync(OUTPUT_PATH).size / 1024);
  console.log(`Generated ${TOTAL_REVIEWS} reviews spanning ${Math.round(DAYS_BACK / 365)} years`);
  console.log(`Saved to ${OUTPUT_PATH} (${sizeKB} KB)`);
}

main();
