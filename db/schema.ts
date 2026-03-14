/**
 * db/schema.ts
 * Creates all tables and indexes in canopy.db.
 * Run: npx tsx db/schema.ts
 * Or import createSchema(db) from other scripts.
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR  = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "canopy.db");

export function createSchema(db: Database.Database): void {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`

  -- ── Users ──────────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin')),
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    last_login    TEXT
  );

  -- ── Resources ──────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS resources (
    id                          TEXT PRIMARY KEY,
    name                        TEXT,
    description                 TEXT,
    description_es              TEXT,
    street                      TEXT,
    city                        TEXT,
    state                       TEXT,
    zip_code                    TEXT,
    lat                         REAL,
    lng                         REAL,
    timezone                    TEXT NOT NULL DEFAULT 'America/New_York',
    website                     TEXT,
    resource_type               TEXT NOT NULL DEFAULT 'FOOD_PANTRY',
    accepting_new_clients       INTEGER NOT NULL DEFAULT 1,
    open_by_appointment         INTEGER NOT NULL DEFAULT 0,
    contact_phone               TEXT,
    image_url                   TEXT,
    merged_to_resource_id       TEXT,
    usage_limit_count           INTEGER,
    usage_limit_interval_count  INTEGER,
    usage_limit_interval        TEXT,
    usage_limit_calendar_reset  INTEGER NOT NULL DEFAULT 0,
    wait_time_minutes_average   REAL,
    rating_avg                  REAL,
    review_count                INTEGER NOT NULL DEFAULT 0,
    confidence                  REAL,
    reliability_score           INTEGER,
    tag_names                   TEXT NOT NULL DEFAULT '[]',
    is_open_now                 INTEGER NOT NULL DEFAULT 0,
    raw_json                    TEXT NOT NULL DEFAULT '{}',
    ingested_at                 TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_resources_zip      ON resources(zip_code);
  CREATE INDEX IF NOT EXISTS idx_resources_type     ON resources(resource_type);
  CREATE INDEX IF NOT EXISTS idx_resources_rating   ON resources(rating_avg);
  CREATE INDEX IF NOT EXISTS idx_resources_lat_lng  ON resources(lat, lng);

  -- ── Shifts ─────────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS shifts (
    id                 TEXT PRIMARY KEY,
    resource_id        TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    start_time         TEXT NOT NULL,
    end_time           TEXT NOT NULL,
    recurrence_pattern TEXT,
    duration_minutes   INTEGER,
    is_all_day         INTEGER NOT NULL DEFAULT 0,
    address_override   TEXT,
    lat                REAL,
    lng                REAL,
    location_name      TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_shifts_resource ON shifts(resource_id);

  -- ── Occurrences ────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS occurrences (
    id               TEXT PRIMARY KEY,
    resource_id      TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    shift_id         TEXT REFERENCES shifts(id),
    start_time       TEXT NOT NULL,
    end_time         TEXT NOT NULL,
    confirmed        INTEGER NOT NULL DEFAULT 0,
    skipped          INTEGER NOT NULL DEFAULT 0,
    title            TEXT,
    title_es         TEXT,
    description      TEXT,
    description_es   TEXT,
    address_override TEXT,
    lat              REAL,
    lng              REAL,
    location_name    TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_occurrences_resource   ON occurrences(resource_id);
  CREATE INDEX IF NOT EXISTS idx_occurrences_start_time ON occurrences(start_time);
  CREATE INDEX IF NOT EXISTS idx_occurrences_shift      ON occurrences(shift_id);

  -- ── Resource Tags ──────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS resource_tags (
    resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    tag_id      TEXT NOT NULL,
    tag_name    TEXT NOT NULL,
    tag_name_es TEXT,
    category_id TEXT,
    PRIMARY KEY (resource_id, tag_id)
  );

  -- ── Reviews ────────────────────────────────────────────────────────────────
  --
  -- SPEC FIELDS (resource-review-spec.pdf):
  --   These match the JSON schema exactly, converted to snake_case.
  --   Do not rename or remove these without updating the spec mapping.
  --
  -- APP FIELDS:
  --   Additions for our moderation UI, analytics, and incentive program.
  --   Clearly separated with a comment block below.
  --
  CREATE TABLE IF NOT EXISTS reviews (

    -- ── Spec: required ─────────────────────────────────────────────────────
    id                        TEXT PRIMARY KEY,
    created_at                TEXT NOT NULL DEFAULT (datetime('now')),
    share_text_with_resource  INTEGER NOT NULL DEFAULT 0,  -- spec: shareTextWithResource
    author_id                 TEXT NOT NULL REFERENCES users(id),
                                                           -- spec: authorId (required)
    resource_id               TEXT NOT NULL REFERENCES resources(id),
                                                           -- spec: resourceId (required)

    -- ── Spec: optional ─────────────────────────────────────────────────────
    attended                  INTEGER CHECK (attended IN (0,1)),
                                                           -- spec: attended (bool|null)
    deleted_at                TEXT,                        -- spec: deletedAt (soft delete)
    did_not_attend_reason     TEXT,                        -- spec: didNotAttendReason
    information_accurate      INTEGER CHECK (information_accurate IN (0,1)),
                                                           -- spec: informationAccurate (bool|null)
    photo_public              INTEGER CHECK (photo_public IN (0,1)),
                                                           -- spec: photoPublic (bool|null)
    photo_url                 TEXT,                        -- spec: photoUrl (uri|null)
    rating                    INTEGER CHECK (rating BETWEEN 1 AND 5),
                                                           -- spec: rating (1-5|null)
    text                      TEXT,                        -- spec: text
    wait_time_minutes         INTEGER CHECK (wait_time_minutes >= 0),
                                                           -- spec: waitTimeMinutes
    occurrence_id             TEXT REFERENCES occurrences(id),
                                                           -- spec: occurrenceId
    user_id                   TEXT REFERENCES users(id),   -- spec: userId (admin who manages)
    reviewed_by_user_id       TEXT REFERENCES users(id),   -- spec: reviewedByUserId

    -- ── App: moderation UI ─────────────────────────────────────────────────
    author_name               TEXT,          -- denormalized for display (avoids JOIN)
    status                    TEXT NOT NULL DEFAULT 'Pending'
                                CHECK (status IN ('Pending','Completed','Flagged')),
    reviewed_by_name          TEXT,          -- denormalized moderator name
    moderation_date           TEXT,          -- date of moderation
    inaccurate_note           TEXT,          -- admin note on what is inaccurate

    -- ── App: incentive program ─────────────────────────────────────────────
    raffle_tickets            INTEGER NOT NULL DEFAULT 0,

    -- ── App: referral tracking ─────────────────────────────────────────────
    referred_by               TEXT,          -- name of volunteer/referrer
    referred_role             TEXT,          -- role of referrer

    -- ── App: photo workflow ────────────────────────────────────────────────
    photo_status              TEXT CHECK (photo_status IN ('Approved','Pending Review')),

    -- ── App: action tracking (maps to UI actionsTaken array) ───────────────
    client_flag_created       INTEGER NOT NULL DEFAULT 0,
    resource_flag_created     INTEGER NOT NULL DEFAULT 0,
    shared_social             INTEGER NOT NULL DEFAULT 0,
    follow_up_sent            INTEGER NOT NULL DEFAULT 0,

    -- ── App: analytics ────────────────────────────────────────────────────
    is_synthetic              INTEGER NOT NULL DEFAULT 0,
    sentiment                 TEXT CHECK (sentiment IN ('positive','neutral','negative'))
  );

  CREATE INDEX IF NOT EXISTS idx_reviews_resource   ON reviews(resource_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_author     ON reviews(author_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_status     ON reviews(status);
  CREATE INDEX IF NOT EXISTS idx_reviews_created    ON reviews(created_at);
  CREATE INDEX IF NOT EXISTS idx_reviews_sentiment  ON reviews(sentiment);
  CREATE INDEX IF NOT EXISTS idx_reviews_occurrence ON reviews(occurrence_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_deleted    ON reviews(deleted_at);

  -- ── AI Summaries ───────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS ai_summaries (
    resource_id   TEXT PRIMARY KEY REFERENCES resources(id),
    summary_json  TEXT NOT NULL,
    generated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- ── Resource review stats view ─────────────────────────────────────────────
  -- Aggregated per-resource. Excludes soft-deleted reviews.
  DROP VIEW IF EXISTS resource_review_stats;
  CREATE VIEW resource_review_stats AS
  SELECT
    resource_id,
    COUNT(*)                                                              AS total_reviews,
    ROUND(AVG(CASE WHEN rating IS NOT NULL THEN rating END), 2)          AS avg_rating,
    ROUND(AVG(CASE WHEN wait_time_minutes IS NOT NULL
                   THEN wait_time_minutes END), 1)                       AS avg_wait_minutes,
    SUM(CASE WHEN attended = 0        THEN 1 ELSE 0 END)                AS did_not_attend_count,
    SUM(CASE WHEN information_accurate = 0 THEN 1 ELSE 0 END)           AS inaccurate_info_count,
    SUM(CASE WHEN sentiment = 'positive'  THEN 1 ELSE 0 END)            AS positive_count,
    SUM(CASE WHEN sentiment = 'negative'  THEN 1 ELSE 0 END)            AS negative_count,
    ROUND(
      100.0 * SUM(CASE WHEN information_accurate = 1 THEN 1 ELSE 0 END)
              / NULLIF(COUNT(*), 0), 1
    )                                                                     AS info_accuracy_pct,
    SUM(CASE WHEN status = 'Pending'  THEN 1 ELSE 0 END)                AS pending_count,
    SUM(CASE WHEN status = 'Flagged'  THEN 1 ELSE 0 END)                AS flagged_count,
    MIN(created_at)                                                       AS earliest_review,
    MAX(created_at)                                                       AS latest_review
  FROM reviews
  WHERE deleted_at IS NULL
  GROUP BY resource_id;

  `);
}

// ─── Run directly ─────────────────────────────────────────────────────────────

if (require.main === module) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  createSchema(db);

  const tables = db
    .prepare(`SELECT name, type FROM sqlite_master WHERE type IN ('table','view') ORDER BY type, name`)
    .all() as { name: string; type: string }[];

  console.log("✅ Schema created at", DB_PATH);
  console.log("\nTables:");
  tables.filter(t => t.type === "table").forEach(t => console.log(" ", t.name));
  console.log("\nViews:");
  tables.filter(t => t.type === "view").forEach(t => console.log(" ", t.name));

  db.close();
}