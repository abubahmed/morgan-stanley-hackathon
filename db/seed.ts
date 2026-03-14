/**
 * db/seed.ts
 * Seeds canopy.db with:
 *   1. Resources from lemontree_resources.json
 *   2. Demo users (1 admin + 5 clients)
 *   3. Real reviews matching the UI's INITIAL_REVIEWS dummy data exactly
 *   4. Additional synthetic reviews for coverage
 *
 * Run: npx tsx db/seed.ts
 * Flags: --force  wipe and re-seed
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createSchema } from "./schema";

const DB_PATH       = path.join(process.cwd(), "data", "canopy.db");
const RESOURCES_JSON = path.join(process.cwd(), "lemontree_resources.json");
const FORCE         = process.argv.includes("--force");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nanoid(len = 20): string {
  return crypto.randomBytes(len).toString("hex").slice(0, len);
}

function fakeHash(password: string): string {
  // For dev seeding only — replace with bcrypt in production
  return `dev_hash_${Buffer.from(password).toString("base64")}`;
}

function sentimentFromRating(r: number | null): string | null {
  if (r === null) return null;
  if (r >= 4) return "positive";
  if (r <= 2) return "negative";
  return "neutral";
}

function ticketsFromRating(r: number): number {
  if (r >= 5) return 5;
  if (r >= 4) return 4;
  if (r >= 3) return 3;
  return 2;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log("🌳 Canopy seed starting...\n");

  fs.mkdirSync(path.join(process.cwd(), "data"), { recursive: true });

  const db = new Database(DB_PATH);
  createSchema(db);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  if (FORCE) {
    console.log("🗑  --force: clearing existing data\n");
    db.exec(`
      DELETE FROM ai_summaries;
      DELETE FROM reviews;
      DELETE FROM resource_tags;
      DELETE FROM occurrences;
      DELETE FROM shifts;
      DELETE FROM resources;
      DELETE FROM users;
    `);
  }

  // ── 1. Resources from JSON ─────────────────────────────────────────────────

  if (!fs.existsSync(RESOURCES_JSON)) {
    console.warn(`⚠️  ${RESOURCES_JSON} not found — skipping resource seed`);
  } else {
    const raw = JSON.parse(fs.readFileSync(RESOURCES_JSON, "utf-8"));
    console.log(`📦 Loading ${raw.length} resources from JSON...`);

    const upsertResource = db.prepare(`
      INSERT OR REPLACE INTO resources (
        id, name, description, description_es,
        street, city, state, zip_code, lat, lng, timezone, website,
        resource_type, accepting_new_clients, open_by_appointment,
        contact_phone, image_url, merged_to_resource_id,
        usage_limit_count, usage_limit_interval_count,
        usage_limit_interval, usage_limit_calendar_reset,
        wait_time_minutes_average, rating_avg, review_count, confidence,
        tag_names, is_open_now, raw_json, ingested_at
      ) VALUES (
        @id, @name, @description, @description_es,
        @street, @city, @state, @zip_code, @lat, @lng, @timezone, @website,
        @resource_type, @accepting_new_clients, @open_by_appointment,
        @contact_phone, @image_url, @merged_to_resource_id,
        @usage_limit_count, @usage_limit_interval_count,
        @usage_limit_interval, @usage_limit_calendar_reset,
        @wait_time_minutes_average, @rating_avg, @review_count, @confidence,
        @tag_names, @is_open_now, @raw_json, @ingested_at
      )
    `);

    const upsertShift = db.prepare(`
      INSERT OR REPLACE INTO shifts (
        id, resource_id, start_time, end_time, recurrence_pattern,
        duration_minutes, is_all_day, address_override, lat, lng, location_name
      ) VALUES (
        @id, @resource_id, @start_time, @end_time, @recurrence_pattern,
        @duration_minutes, @is_all_day, @address_override, @lat, @lng, @location_name
      )
    `);

    const upsertOccurrence = db.prepare(`
      INSERT OR REPLACE INTO occurrences (
        id, resource_id, shift_id, start_time, end_time,
        confirmed, skipped, title, title_es, description, description_es,
        address_override, lat, lng, location_name
      ) VALUES (
        @id, @resource_id, @shift_id, @start_time, @end_time,
        @confirmed, @skipped, @title, @title_es, @description, @description_es,
        @address_override, @lat, @lng, @location_name
      )
    `);

    const upsertTag = db.prepare(`
      INSERT OR REPLACE INTO resource_tags (resource_id, tag_id, tag_name, tag_name_es, category_id)
      VALUES (@resource_id, @tag_id, @tag_name, @tag_name_es, @category_id)
    `);
    const insertedResourceIds = new Set<string>();

    const loadAll = db.transaction((resources: any[]) => {
      for (const r of resources) {
        // if (r.resourceStatus?.id === "REMOVED") continue;
        if (!r.id) continue;

        const now = new Date();
        const isOpenNow = (r.occurrences ?? []).some((o: any) => {
          if (o.skippedAt) return false;
          return new Date(o.startTime) <= now && new Date(o.endTime) >= now;
        });

        upsertResource.run({
          id:                         r.id,
          name:                       r.name,
          description:                r.description,
          description_es:             r.description_es,
          street:                     r.addressStreet1,
          city:                       r.city,
          state:                      r.state,
          zip_code:                   r.zipCode,
          lat:                        r.latitude,
          lng:                        r.longitude,
          timezone:                   r.timezone ?? "America/New_York",
          website:                    r.website,
          resource_type:              r.resourceType?.id ?? "OTHER",
          accepting_new_clients:      r.acceptingNewClients ? 1 : 0,
          open_by_appointment:        r.openByAppointment ? 1 : 0,
          contact_phone:              r.contacts?.[0]?.phone ?? null,
          image_url:                  r.images?.[0]?.url ?? null,
          merged_to_resource_id:      r.mergedToResourceId,
          usage_limit_count:          r.usageLimitCount,
          usage_limit_interval_count: r.usageLimitIntervalCount,
          usage_limit_interval:       r.usageLimitIntervalUnit,
          usage_limit_calendar_reset: r.usageLimitCalendarReset ? 1 : 0,
          wait_time_minutes_average:  r.waitTimeMinutesAverage ?? null,
          rating_avg:                 r.ratingAverage,
          review_count:               r._count?.reviews ?? 0,
          confidence:                 r.confidence,
          tag_names:                  JSON.stringify((r.tags ?? []).map((t: any) => t.name)),
          is_open_now:                isOpenNow ? 1 : 0,
          raw_json:                   JSON.stringify(r),
          ingested_at:                new Date().toISOString(),
        });

        insertedResourceIds.add(r.id);
        for (const s of r.shifts ?? []) {
            if (!s.startTime || !s.endTime) continue;
          upsertShift.run({
            id:                 s.id,
            resource_id:        r.id,
            start_time:         s.startTime,
            end_time:           s.endTime,
            recurrence_pattern: s.recurrencePattern,
            duration_minutes:   s.durationMinutes,
            is_all_day:         s.isAllDay ? 1 : 0,
            address_override:   s.address,
            lat:                s.latitude,
            lng:                s.longitude,
            location_name:      s.locationName ?? null,
          });
        }

        for (const o of r.occurrences ?? []) {
            if (!o.startTime || !o.endTime || !o.id) continue;
            try {
              upsertOccurrence.run({
                id:              o.id,
                resource_id:     r.id,
                shift_id:        null,        // always null — avoids FK on skipped shifts
                start_time:      o.startTime,
                end_time:        o.endTime,
                confirmed:       o.confirmedAt ? 1 : 0,
                skipped:         o.skippedAt  ? 1 : 0,
                title:           o.title      ?? null,
                title_es:        o.title_es   ?? null,
                description:     o.description ?? null,
                description_es:  o.description_es ?? null,
                address_override: o.address   ?? null,
                lat:             o.latitude   ?? null,
                lng:             o.longitude  ?? null,
                location_name:   o.locationName ?? null,
              });
            } catch (e: any) {
              // Log the offending occurrence so we can debug, then skip it
              console.warn(`  ⚠️  Skipped occurrence ${o.id} for resource ${r.id}: ${e.message}`);
            }
          }

        for (const t of r.tags ?? []) {
          upsertTag.run({
            resource_id: r.id,
            tag_id:      t.id,
            tag_name:    t.name,
            tag_name_es: t.name_es ?? null,
            category_id: t.tagCategoryId,
          });
        }
      }
    });

    loadAll(raw);
    const count = (db.prepare("SELECT COUNT(*) as c FROM resources").get() as any).c;
    console.log(`  ✓ ${count} resources loaded\n`);
  }

  // ── 2. Demo users ──────────────────────────────────────────────────────────

  console.log("👤 Seeding demo users...");

  const upsertUser = db.prepare(`
    INSERT OR REPLACE INTO users (id, name, email, password_hash, role, created_at)
    VALUES (@id, @name, @email, @password_hash, @role, @created_at)
  `);

  const demoUsers = [
    { id: "admin_001", name: "Jessica Martinez", email: "jessica@canopy.dev", role: "admin",  password: "admin123" },
    { id: "admin_002", name: "David Lee",         email: "david@canopy.dev",   role: "admin",  password: "admin123" },
    { id: "user_001",  name: "Maria Rodriguez",   email: "maria@example.com",  role: "client", password: "user123" },
    { id: "user_002",  name: "James Wilson",       email: "james@example.com",  role: "client", password: "user123" },
    { id: "user_003",  name: "Lisa Thompson",      email: "lisa@example.com",   role: "client", password: "user123" },
    { id: "user_004",  name: "Robert Martinez",    email: "robert@example.com", role: "client", password: "user123" },
    { id: "user_005",  name: "Patricia Johnson",   email: "patricia@example.com",role: "client", password: "user123" },
  ];

  for (const u of demoUsers) {
    upsertUser.run({
      id:            u.id,
      name:          u.name,
      email:         u.email,
      password_hash: fakeHash(u.password),
      role:          u.role,
      created_at:    new Date().toISOString(),
    });
  }
  console.log(`  ✓ ${demoUsers.length} users seeded\n`);

  // ── 3. Reviews matching UI INITIAL_REVIEWS exactly ─────────────────────────

  console.log("⭐ Seeding reviews aligned with UI...");

  // Get first resource ID to attach reviews to (or use known IDs from JSON)
  const firstResource = db.prepare(
    "SELECT id, name FROM resources WHERE name IS NOT NULL LIMIT 1"
  ).get() as { id: string; name: string } | undefined;

  // Use specific resource IDs from the JSON if available, else fallback
  const resources = db
    .prepare("SELECT id, name FROM resources WHERE name IS NOT NULL LIMIT 10")
    .all() as { id: string; name: string }[];

  const rid = (i: number) => resources[i % resources.length]?.id ?? "unknown";

  const upsertReview = db.prepare(`
    INSERT OR REPLACE INTO reviews (
      id, resource_id, author_id, author_name, created_at, deleted_at,
      status, rating, text, attended, did_not_attend_reason, wait_time_minutes,
      information_accurate, inaccurate_note,
      photo_url, photo_public, photo_status,
      share_text_with_resource, referred_by, referred_role, raffle_tickets,
      reviewed_by_user_id, reviewed_by_name, moderation_date,
      client_flag_created, resource_flag_created, shared_social, follow_up_sent,
      is_synthetic, sentiment
    ) VALUES (
      @id, @resource_id, @author_id, @author_name, @created_at, @deleted_at,
      @status, @rating, @text, @attended, @did_not_attend_reason, @wait_time_minutes,
      @information_accurate, @inaccurate_note,
      @photo_url, @photo_public, @photo_status,
      @share_text_with_resource, @referred_by, @referred_role, @raffle_tickets,
      @reviewed_by_user_id, @reviewed_by_name, @moderation_date,
      @client_flag_created, @resource_flag_created, @shared_social, @follow_up_sent,
      @is_synthetic, @sentiment
    )
  `);

  // These exactly mirror the UI's INITIAL_REVIEWS array
  const demoReviews = [
    {
      id:                       "REV-001",
      resource_id:              rid(0),
      author_id:                "user_001",
      author_name:              "Maria Rodriguez",
      created_at:               "2026-03-14T10:00:00Z",
      deleted_at:               null,
      status:                   "Completed",
      rating:                   5,
      text:                     "The food pantry was well-stocked and the volunteers were incredibly kind. They helped me find culturally appropriate foods for my family.",
      attended:                 1,
      did_not_attend_reason:    null,
      wait_time_minutes:        15,
      information_accurate:     1,
      inaccurate_note:          null,
      photo_url:                "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=120&h=90&fit=crop",
      photo_public:             1,
      photo_status:             "Approved",
      share_text_with_resource: 1,
      referred_by:              "Sarah Chen",
      referred_role:            "Volunteer",
      raffle_tickets:           5,
      reviewed_by_user_id:      "admin_001",
      reviewed_by_name:         "Jessica Martinez",
      moderation_date:          "2026-03-14",
      client_flag_created:      0,
      resource_flag_created:    0,
      shared_social:            1,
      follow_up_sent:           1,
      is_synthetic:             0,
      sentiment:                "positive",
    },
    {
      id:                       "REV-002",
      resource_id:              rid(1),
      author_id:                "user_002",
      author_name:              "James Wilson",
      created_at:               "2026-03-13T11:00:00Z",
      deleted_at:               null,
      status:                   "Flagged",
      rating:                   2,
      text:                     "Good service but they ran out of fresh produce by the time I arrived. Would appreciate if they could stock more vegetables.",
      attended:                 1,
      did_not_attend_reason:    null,
      wait_time_minutes:        45,
      information_accurate:     1,
      inaccurate_note:          null,
      photo_url:                null,
      photo_public:             null,
      photo_status:             null,
      share_text_with_resource: 0,
      referred_by:              "Michael Brown",
      referred_role:            "Outreach",
      raffle_tickets:           3,
      reviewed_by_user_id:      "admin_002",
      reviewed_by_name:         "David Lee",
      moderation_date:          "2026-03-13",
      client_flag_created:      0,
      resource_flag_created:    1,
      shared_social:            0,
      follow_up_sent:           0,
      is_synthetic:             0,
      sentiment:                "negative",
    },
    {
      id:                       "REV-003",
      resource_id:              rid(2),
      author_id:                "user_003",
      author_name:              "Lisa Thompson",
      created_at:               "2026-03-12T14:00:00Z",
      deleted_at:               null,
      status:                   "Pending",
      rating:                   4,
      text:                     "Great experience overall. The wait time was a bit long but the staff made it worth it with their warmth and care.",
      attended:                 1,
      did_not_attend_reason:    null,
      wait_time_minutes:        60,
      information_accurate:     1,
      inaccurate_note:          null,
      photo_url:                "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=120&h=90&fit=crop",
      photo_public:             0,
      photo_status:             "Pending Review",
      share_text_with_resource: 0,
      referred_by:              "Direct Visit",
      referred_role:            "",
      raffle_tickets:           4,
      reviewed_by_user_id:      null,
      reviewed_by_name:         null,
      moderation_date:          null,
      client_flag_created:      0,
      resource_flag_created:    0,
      shared_social:            0,
      follow_up_sent:           0,
      is_synthetic:             0,
      sentiment:                "positive",
    },
    {
      id:                       "REV-004",
      resource_id:              rid(0),
      author_id:                "user_004",
      author_name:              "Robert Martinez",
      created_at:               "2026-03-11T09:30:00Z",
      deleted_at:               null,
      status:                   "Flagged",
      rating:                   2,
      text:                     "I appreciate the help but I have specific dietary needs that weren't accommodated. I need diabetic-friendly options.",
      attended:                 1,
      did_not_attend_reason:    null,
      wait_time_minutes:        30,
      information_accurate:     0,
      inaccurate_note:          "Client mentioned incorrect pantry hours - actual hours are Mon-Fri 9am-5pm, not as stated in review",
      photo_url:                null,
      photo_public:             null,
      photo_status:             null,
      share_text_with_resource: 0,
      referred_by:              "Emily Davis",
      referred_role:            "Healthcare",
      raffle_tickets:           2,
      reviewed_by_user_id:      "admin_001",
      reviewed_by_name:         "Jessica Martinez",
      moderation_date:          "2026-03-11",
      client_flag_created:      1,
      resource_flag_created:    1,
      shared_social:            0,
      follow_up_sent:           1,
      is_synthetic:             0,
      sentiment:                "negative",
    },
    {
      id:                       "REV-005",
      resource_id:              rid(3),
      author_id:                "user_005",
      author_name:              "Patricia Johnson",
      created_at:               "2026-03-10T15:00:00Z",
      deleted_at:               null,
      status:                   "Completed",
      rating:                   5,
      text:                     "Wonderful service! Found everything I needed and the volunteers even helped me carry groceries to my car. So grateful for this resource.",
      attended:                 1,
      did_not_attend_reason:    null,
      wait_time_minutes:        10,
      information_accurate:     1,
      inaccurate_note:          null,
      photo_url:                "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=120&h=90&fit=crop",
      photo_public:             1,
      photo_status:             "Approved",
      share_text_with_resource: 1,
      referred_by:              "Jessica Lee",
      referred_role:            "Community",
      raffle_tickets:           5,
      reviewed_by_user_id:      "admin_002",
      reviewed_by_name:         "David Lee",
      moderation_date:          "2026-03-10",
      client_flag_created:      0,
      resource_flag_created:    0,
      shared_social:            1,
      follow_up_sent:           0,
      is_synthetic:             0,
      sentiment:                "positive",
    },
    {
        id:                       "REV-006",
        resource_id:              rid(0),
        author_id:                "user_001",
        author_name:              "Carmen Diaz",
        created_at:               "2026-03-09T10:00:00Z",
        deleted_at:               null,
        status:                   "Completed",
        rating:                   5,
        text:                     "They had halal meat options which I have never seen at any other pantry. Made my family feel truly included.",
        attended:                 1,
        did_not_attend_reason:    null,
        wait_time_minutes:        20,
        information_accurate:     1,
        inaccurate_note:          null,
        photo_url:                null,
        photo_public:             null,
        photo_status:             null,
        share_text_with_resource: 1,
        referred_by:              "Community Board",
        referred_role:            "Community",
        raffle_tickets:           5,
        reviewed_by_user_id:      "admin_001",
        reviewed_by_name:         "Jessica Martinez",
        moderation_date:          "2026-03-09",
        client_flag_created:      0,
        resource_flag_created:    0,
        shared_social:            1,
        follow_up_sent:           0,
        is_synthetic:             0,
        sentiment:                "positive",
      },
      {
        id:                       "REV-007",
        resource_id:              rid(1),
        author_id:                "user_003",
        author_name:              "Devon Harris",
        created_at:               "2026-03-08T14:00:00Z",
        deleted_at:               null,
        status:                   "Flagged",
        rating:                   1,
        text:                     "Arrived at the listed time and the location was completely closed. No sign, no notice. Wasted two bus rides.",
        attended:                 0,
        did_not_attend_reason:    "Location was closed when I arrived",
        wait_time_minutes:        null,
        information_accurate:     0,
        inaccurate_note:          "Client reports location closed during listed hours — needs verification",
        photo_url:                null,
        photo_public:             null,
        photo_status:             null,
        share_text_with_resource: 0,
        referred_by:              "211 Helpline",
        referred_role:            "Outreach",
        raffle_tickets:           2,
        reviewed_by_user_id:      "admin_002",
        reviewed_by_name:         "David Lee",
        moderation_date:          "2026-03-08",
        client_flag_created:      0,
        resource_flag_created:    1,
        shared_social:            0,
        follow_up_sent:           1,
        is_synthetic:             0,
        sentiment:                "negative",
      },
      {
        id:                       "REV-008",
        resource_id:              rid(2),
        author_id:                "user_002",
        author_name:              "Nguyen Thi Lan",
        created_at:               "2026-03-07T11:30:00Z",
        deleted_at:               null,
        status:                   "Pending",
        rating:                   3,
        text:                     "Decent selection but the line was very long. Waited nearly 90 minutes. Staff were kind though.",
        attended:                 1,
        did_not_attend_reason:    null,
        wait_time_minutes:        90,
        information_accurate:     1,
        inaccurate_note:          null,
        photo_url:                "https://images.unsplash.com/photo-1542838132-92c53300491e?w=120&h=90&fit=crop",
        photo_public:             0,
        photo_status:             "Pending Review",
        share_text_with_resource: 0,
        referred_by:              "Social Worker",
        referred_role:            "Healthcare",
        raffle_tickets:           3,
        reviewed_by_user_id:      null,
        reviewed_by_name:         null,
        moderation_date:          null,
        client_flag_created:      0,
        resource_flag_created:    0,
        shared_social:            0,
        follow_up_sent:           0,
        is_synthetic:             0,
        sentiment:                "neutral",
      },
      {
        id:                       "REV-009",
        resource_id:              rid(3),
        author_id:                "user_004",
        author_name:              "Marcus Webb",
        created_at:               "2026-03-06T09:00:00Z",
        deleted_at:               null,
        status:                   "Completed",
        rating:                   4,
        text:                     "Great fresh produce this week — strawberries, lettuce, and tomatoes. A bit crowded but worth it.",
        attended:                 1,
        did_not_attend_reason:    null,
        wait_time_minutes:        25,
        information_accurate:     1,
        inaccurate_note:          null,
        photo_url:                "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=120&h=90&fit=crop",
        photo_public:             1,
        photo_status:             "Approved",
        share_text_with_resource: 1,
        referred_by:              "Direct Visit",
        referred_role:            "",
        raffle_tickets:           4,
        reviewed_by_user_id:      "admin_001",
        reviewed_by_name:         "Jessica Martinez",
        moderation_date:          "2026-03-06",
        client_flag_created:      0,
        resource_flag_created:    0,
        shared_social:            1,
        follow_up_sent:           0,
        is_synthetic:             0,
        sentiment:                "positive",
      },
      {
        id:                       "REV-010",
        resource_id:              rid(1),
        author_id:                "user_005",
        author_name:              "Fatima Al-Hassan",
        created_at:               "2026-03-05T15:00:00Z",
        deleted_at:               null,
        status:                   "Pending",
        rating:                   4,
        text:                     "Bilingual volunteers made everything easy for my grandmother who doesn't speak English. Very grateful.",
        attended:                 1,
        did_not_attend_reason:    null,
        wait_time_minutes:        15,
        information_accurate:     1,
        inaccurate_note:          null,
        photo_url:                null,
        photo_public:             null,
        photo_status:             null,
        share_text_with_resource: 1,
        referred_by:              "Mosque Outreach",
        referred_role:            "Community",
        raffle_tickets:           4,
        reviewed_by_user_id:      null,
        reviewed_by_name:         null,
        moderation_date:          null,
        client_flag_created:      0,
        resource_flag_created:    0,
        shared_social:            0,
        follow_up_sent:           0,
        is_synthetic:             0,
        sentiment:                "positive",
      }
  ];

  const seedReviews = db.transaction((reviews: typeof demoReviews) => {
    for (const r of reviews) upsertReview.run(r);
  });

  seedReviews(demoReviews);
  console.log(`  ✓ ${demoReviews.length} UI-aligned reviews seeded\n`);

  // ── Spot check ────────────────────────────────────────────────────────────

  const stats = {
    users:     (db.prepare("SELECT COUNT(*) as c FROM users").get() as any).c,
    resources: (db.prepare("SELECT COUNT(*) as c FROM resources").get() as any).c,
    shifts:    (db.prepare("SELECT COUNT(*) as c FROM shifts").get() as any).c,
    reviews:   (db.prepare("SELECT COUNT(*) as c FROM reviews").get() as any).c,
  };

  console.log("── Summary ──────────────────────────────");
  console.log(`  Users:     ${stats.users}`);
  console.log(`  Resources: ${stats.resources}`);
  console.log(`  Shifts:    ${stats.shifts}`);
  console.log(`  Reviews:   ${stats.reviews}`);
  console.log("─────────────────────────────────────────\n");

  // Verify UI alignment
  const sample = db.prepare(`
    SELECT rv.id, rv.author_name, rv.status, rv.rating as stars,
           rv.raffle_tickets as tickets, r.name as location
    FROM reviews rv
    JOIN resources r ON r.id = rv.resource_id
    WHERE rv.is_synthetic = 0
    ORDER BY rv.created_at DESC
  `).all() as any[];

  console.log("── Review ↔ UI alignment check ──────────");
  sample.forEach(r =>
    console.log(`  ${r.id}  ${r.author_name.padEnd(18)} ★${r.stars}  ${r.tickets}🎟  [${r.status}]`)
  );
  console.log("─────────────────────────────────────────\n");

  db.close();
  console.log("✅ Seed complete");
}

main();