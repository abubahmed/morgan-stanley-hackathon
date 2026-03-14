/**
 * db/seed-reviews-patch.ts
 *
 * PATCH for db/seed.ts — replaces the upsertReview prepared statement
 * and demoReviews array to be spec-compliant.
 *
 * Key change: author_id is now NOT NULL (spec marks it required).
 * Every review must reference a real user in the users table.
 * synthetic/anonymous reviews use a dedicated "anonymous_user" row.
 *
 * Apply by replacing the relevant sections in db/seed.ts, or run standalone:
 *   npx tsx db/seed-reviews-patch.ts
 */

import Database from "better-sqlite3";
import path from "path";
import { createSchema } from "./schema";

const DB_PATH = path.join(process.cwd(), "data", "canopy.db");

export function seedReviews(db: Database.Database) {
  createSchema(db);

  // Ensure anonymous user exists for synthetic/walk-in reviews
  db.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, password_hash, role)
    VALUES ('anon_user', 'Anonymous', 'anon@canopy.internal', 'n/a', 'client')
  `).run();

  const upsertReview = db.prepare(`
    INSERT OR REPLACE INTO reviews (
      -- ── Spec: required ────────────────────────────────────────────────
      id,
      created_at,
      share_text_with_resource,
      author_id,
      resource_id,
      -- ── Spec: optional ────────────────────────────────────────────────
      attended,
      deleted_at,
      did_not_attend_reason,
      information_accurate,
      photo_public,
      photo_url,
      rating,
      text,
      wait_time_minutes,
      occurrence_id,
      user_id,
      reviewed_by_user_id,
      -- ── App fields ─────────────────────────────────────────────────────
      author_name,
      status,
      reviewed_by_name,
      moderation_date,
      inaccurate_note,
      raffle_tickets,
      referred_by,
      referred_role,
      photo_status,
      client_flag_created,
      resource_flag_created,
      shared_social,
      follow_up_sent,
      is_synthetic,
      sentiment
    ) VALUES (
      @id,
      @created_at,
      @share_text_with_resource,
      @author_id,
      @resource_id,
      @attended,
      @deleted_at,
      @did_not_attend_reason,
      @information_accurate,
      @photo_public,
      @photo_url,
      @rating,
      @text,
      @wait_time_minutes,
      @occurrence_id,
      @user_id,
      @reviewed_by_user_id,
      @author_name,
      @status,
      @reviewed_by_name,
      @moderation_date,
      @inaccurate_note,
      @raffle_tickets,
      @referred_by,
      @referred_role,
      @photo_status,
      @client_flag_created,
      @resource_flag_created,
      @shared_social,
      @follow_up_sent,
      @is_synthetic,
      @sentiment
    )
  `);

  // Get real resource IDs from the DB
  const resources = db
    .prepare("SELECT id, name FROM resources WHERE name IS NOT NULL LIMIT 10")
    .all() as { id: string; name: string }[];

  if (resources.length === 0) {
    console.warn("⚠️  No resources found — insert resources first");
    return;
  }

  const rid = (i: number) => resources[i % resources.length].id;

  // ── Demo reviews — spec-compliant ────────────────────────────────────────
  // author_id references real users (seeded before this runs)
  // user_id = admin who manages the review (can be null)
  // reviewed_by_user_id = admin who moderated (can be null if unmoderated)

  const demoReviews = [
    {
      // Spec fields
      id:                       "REV-001",
      created_at:               "2026-03-14T10:00:00Z",
      share_text_with_resource: 1,
      author_id:                "user_001",       // spec: authorId (required)
      resource_id:              rid(0),            // spec: resourceId (required)
      attended:                 1,                 // spec: attended
      deleted_at:               null,              // spec: deletedAt
      did_not_attend_reason:    null,              // spec: didNotAttendReason
      information_accurate:     1,                 // spec: informationAccurate
      photo_public:             1,                 // spec: photoPublic
      photo_url:                "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=120&h=90&fit=crop",
      rating:                   5,                 // spec: rating
      text:                     "The food pantry was well-stocked and the volunteers were incredibly kind. They helped me find culturally appropriate foods for my family.",
      wait_time_minutes:        15,                // spec: waitTimeMinutes
      occurrence_id:            null,              // spec: occurrenceId
      user_id:                  null,              // spec: userId
      reviewed_by_user_id:      "admin_001",       // spec: reviewedByUserId
      // App fields
      author_name:              "Maria Rodriguez",
      status:                   "Completed",
      reviewed_by_name:         "Jessica Martinez",
      moderation_date:          "2026-03-14",
      inaccurate_note:          null,
      raffle_tickets:           5,
      referred_by:              "Sarah Chen",
      referred_role:            "Volunteer",
      photo_status:             "Approved",
      client_flag_created:      0,
      resource_flag_created:    0,
      shared_social:            1,
      follow_up_sent:           1,
      is_synthetic:             0,
      sentiment:                "positive",
    },
    {
      id:                       "REV-002",
      created_at:               "2026-03-13T11:00:00Z",
      share_text_with_resource: 0,
      author_id:                "user_002",
      resource_id:              rid(1),
      attended:                 1,
      deleted_at:               null,
      did_not_attend_reason:    null,
      information_accurate:     1,
      photo_public:             null,
      photo_url:                null,
      rating:                   2,
      text:                     "Good service but they ran out of fresh produce by the time I arrived. Would appreciate if they could stock more vegetables.",
      wait_time_minutes:        45,
      occurrence_id:            null,
      user_id:                  null,
      reviewed_by_user_id:      "admin_002",
      author_name:              "James Wilson",
      status:                   "Flagged",
      reviewed_by_name:         "David Lee",
      moderation_date:          "2026-03-13",
      inaccurate_note:          null,
      raffle_tickets:           3,
      referred_by:              "Michael Brown",
      referred_role:            "Outreach",
      photo_status:             null,
      client_flag_created:      0,
      resource_flag_created:    1,
      shared_social:            0,
      follow_up_sent:           0,
      is_synthetic:             0,
      sentiment:                "negative",
    },
    {
      id:                       "REV-003",
      created_at:               "2026-03-12T14:00:00Z",
      share_text_with_resource: 0,
      author_id:                "user_003",
      resource_id:              rid(2),
      attended:                 1,
      deleted_at:               null,
      did_not_attend_reason:    null,
      information_accurate:     1,
      photo_public:             0,
      photo_url:                "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=120&h=90&fit=crop",
      rating:                   4,
      text:                     "Great experience overall. The wait time was a bit long but the staff made it worth it with their warmth and care.",
      wait_time_minutes:        60,
      occurrence_id:            null,
      user_id:                  null,
      reviewed_by_user_id:      null,
      author_name:              "Lisa Thompson",
      status:                   "Pending",
      reviewed_by_name:         null,
      moderation_date:          null,
      inaccurate_note:          null,
      raffle_tickets:           4,
      referred_by:              "Direct Visit",
      referred_role:            "",
      photo_status:             "Pending Review",
      client_flag_created:      0,
      resource_flag_created:    0,
      shared_social:            0,
      follow_up_sent:           0,
      is_synthetic:             0,
      sentiment:                "positive",
    },
    {
      id:                       "REV-004",
      created_at:               "2026-03-11T09:30:00Z",
      share_text_with_resource: 0,
      author_id:                "user_004",
      resource_id:              rid(0),
      attended:                 1,
      deleted_at:               null,
      did_not_attend_reason:    null,
      information_accurate:     0,
      photo_public:             null,
      photo_url:                null,
      rating:                   2,
      text:                     "I appreciate the help but I have specific dietary needs that weren't accommodated. I need diabetic-friendly options.",
      wait_time_minutes:        30,
      occurrence_id:            null,
      user_id:                  "admin_001",       // admin managed this review
      reviewed_by_user_id:      "admin_001",
      author_name:              "Robert Martinez",
      status:                   "Flagged",
      reviewed_by_name:         "Jessica Martinez",
      moderation_date:          "2026-03-11",
      inaccurate_note:          "Client mentioned incorrect pantry hours - actual hours are Mon-Fri 9am-5pm, not as stated in review",
      raffle_tickets:           2,
      referred_by:              "Emily Davis",
      referred_role:            "Healthcare",
      photo_status:             null,
      client_flag_created:      1,
      resource_flag_created:    1,
      shared_social:            0,
      follow_up_sent:           1,
      is_synthetic:             0,
      sentiment:                "negative",
    },
    {
      id:                       "REV-005",
      created_at:               "2026-03-10T15:00:00Z",
      share_text_with_resource: 1,
      author_id:                "user_005",
      resource_id:              rid(3),
      attended:                 1,
      deleted_at:               null,
      did_not_attend_reason:    null,
      information_accurate:     1,
      photo_public:             1,
      photo_url:                "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=120&h=90&fit=crop",
      rating:                   5,
      text:                     "Wonderful service! Found everything I needed and the volunteers even helped me carry groceries to my car. So grateful for this resource.",
      wait_time_minutes:        10,
      occurrence_id:            null,
      user_id:                  null,
      reviewed_by_user_id:      "admin_002",
      author_name:              "Patricia Johnson",
      status:                   "Completed",
      reviewed_by_name:         "David Lee",
      moderation_date:          "2026-03-10",
      inaccurate_note:          null,
      raffle_tickets:           5,
      referred_by:              "Jessica Lee",
      referred_role:            "Community",
      photo_status:             "Approved",
      client_flag_created:      0,
      resource_flag_created:    0,
      shared_social:            1,
      follow_up_sent:           0,
      is_synthetic:             0,
      sentiment:                "positive",
    },
    // Example of did_not_attend with spec-compliant fields
    {
      id:                       "REV-006",
      created_at:               "2026-03-09T08:00:00Z",
      share_text_with_resource: 0,
      author_id:                "user_002",
      resource_id:              rid(1),
      attended:                 0,               // spec: attended = false
      deleted_at:               null,
      did_not_attend_reason:    "Location was closed when I arrived", // spec: didNotAttendReason
      information_accurate:     0,
      photo_public:             null,
      photo_url:                null,
      rating:                   1,
      text:                     "Wasted two bus rides. The hours listed online are completely wrong.",
      wait_time_minutes:        null,            // no wait — never got in
      occurrence_id:            null,
      user_id:                  null,
      reviewed_by_user_id:      "admin_002",
      author_name:              "Devon Harris",
      status:                   "Flagged",
      reviewed_by_name:         "David Lee",
      moderation_date:          "2026-03-09",
      inaccurate_note:          "Client reports location closed during listed hours — needs verification",
      raffle_tickets:           2,
      referred_by:              "211 Helpline",
      referred_role:            "Outreach",
      photo_status:             null,
      client_flag_created:      0,
      resource_flag_created:    1,
      shared_social:            0,
      follow_up_sent:           1,
      is_synthetic:             0,
      sentiment:                "negative",
    },
    // Soft-deleted review (spec: deletedAt non-null)
    {
      id:                       "REV-007",
      created_at:               "2026-03-08T12:00:00Z",
      share_text_with_resource: 0,
      author_id:                "user_003",
      resource_id:              rid(2),
      attended:                 1,
      deleted_at:               "2026-03-09T08:00:00Z", // spec: deletedAt (soft delete)
      did_not_attend_reason:    null,
      information_accurate:     1,
      photo_public:             null,
      photo_url:                null,
      rating:                   3,
      text:                     "This review was submitted by mistake and removed by admin.",
      wait_time_minutes:        null,
      occurrence_id:            null,
      user_id:                  "admin_001",
      reviewed_by_user_id:      "admin_001",
      author_name:              "Test User",
      status:                   "Completed",
      reviewed_by_name:         "Jessica Martinez",
      moderation_date:          "2026-03-09",
      inaccurate_note:          null,
      raffle_tickets:           0,
      referred_by:              null,
      referred_role:            null,
      photo_status:             null,
      client_flag_created:      0,
      resource_flag_created:    0,
      shared_social:            0,
      follow_up_sent:           0,
      is_synthetic:             0,
      sentiment:                "neutral",
    },
  ];

  const insertAll = db.transaction((reviews: typeof demoReviews) => {
    for (const r of reviews) upsertReview.run(r);
  });

  insertAll(demoReviews);
  console.log(`  ✓ ${demoReviews.length} spec-compliant reviews seeded (1 soft-deleted)`);
}

// ─── Run standalone ───────────────────────────────────────────────────────────

if (require.main === module) {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  seedReviews(db);

  // Verify
  const count = (db.prepare("SELECT COUNT(*) as c FROM reviews").get() as any).c;
  const visible = (db.prepare("SELECT COUNT(*) as c FROM reviews WHERE deleted_at IS NULL").get() as any).c;
  console.log(`\n  Total: ${count} | Visible (not soft-deleted): ${visible}`);

  // Show spec field alignment
  const sample = db.prepare(`
    SELECT id, author_id, resource_id, rating, attended,
           information_accurate, share_text_with_resource,
           reviewed_by_user_id, deleted_at
    FROM reviews ORDER BY created_at DESC LIMIT 5
  `).all() as any[];

  console.log("\n  Spec field check:");
  sample.forEach(r =>
    console.log(
      `  ${r.id}  author:${r.author_id.padEnd(10)} ` +
      `rating:${r.rating ?? "null"}  ` +
      `attended:${r.attended}  ` +
      `accurate:${r.information_accurate ?? "null"}  ` +
      `share:${r.share_text_with_resource}  ` +
      `deleted:${r.deleted_at ? "yes" : "no"}`
    )
  );

  db.close();
}