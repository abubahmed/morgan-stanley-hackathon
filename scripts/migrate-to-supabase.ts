/**
 * scripts/migrate-to-supabase.ts
 *
 * Reads data from canopy.db (SQLite) and uploads to Supabase.
 * Run AFTER creating the schema in Supabase SQL editor.
 *
 * Run: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/migrate-to-supabase.ts
 *
 * Flags:
 *   --table users|resources|reviews|all   (default: all)
 *   --batch N                             rows per insert (default: 100)
 */

import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "canopy.db");
const BATCH   = parseInt(process.argv[process.argv.indexOf("--batch") + 1] ?? "100") || 100;
const tableIdx = process.argv.indexOf("--table");
const TABLE    = tableIdx !== -1 ? process.argv[tableIdx + 1] : "all";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}

const db       = new Database(DB_PATH);
const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

// ─── Helper ───────────────────────────────────────────────────────────────────

async function uploadTable(tableName: string, rows: any[], transform?: (r: any) => any) {
  const transformed = transform ? rows.map(transform) : rows;
  let inserted = 0;

  for (let i = 0; i < transformed.length; i += BATCH) {
    const batch = transformed.slice(i, i + BATCH);
    const { error } = await supabase.from(tableName).upsert(batch, { onConflict: "id" });

    if (error) {
      console.error(`  ✗ Batch ${i}-${i + BATCH} failed:`, error.message);
    } else {
      inserted += batch.length;
      const pct = Math.round((inserted / transformed.length) * 100);
      process.stdout.write(`\r  ${pct}%  ${inserted}/${transformed.length} rows`);
    }
  }
  console.log(`\n  ✓ ${inserted} rows uploaded to ${tableName}`);
}

// ─── Transform helpers (SQLite → Postgres types) ──────────────────────────────

function boolCol(val: number | null): boolean | null {
  if (val === null || val === undefined) return null;
  return val === 1;
}

function transformResource(r: any) {
  return {
    ...r,
    accepting_new_clients:      boolCol(r.accepting_new_clients),
    open_by_appointment:        boolCol(r.open_by_appointment),
    usage_limit_calendar_reset: boolCol(r.usage_limit_calendar_reset),
    is_open_now:                boolCol(r.is_open_now),
    tag_names:                  (() => { try { return JSON.parse(r.tag_names ?? "[]"); } catch { return []; } })(),
    raw_json:                   (() => { try { return JSON.parse(r.raw_json ?? "{}"); } catch { return {}; } })(),
    ingested_at:                r.ingested_at || new Date().toISOString(),
  };
}

function transformReview(r: any) {
  return {
    ...r,
    share_text_with_resource: boolCol(r.share_text_with_resource) ?? false,
    attended:                 boolCol(r.attended),
    information_accurate:     boolCol(r.information_accurate),
    photo_public:             boolCol(r.photo_public),
    client_flag_created:      boolCol(r.client_flag_created) ?? false,
    resource_flag_created:    boolCol(r.resource_flag_created) ?? false,
    shared_social:            boolCol(r.shared_social) ?? false,
    follow_up_sent:           boolCol(r.follow_up_sent) ?? false,
    is_synthetic:             boolCol(r.is_synthetic) ?? false,
    created_at:               r.created_at || new Date().toISOString(),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌳 Canopy → Supabase migration\n");

  // Users
  if (TABLE === "all" || TABLE === "users") {
    console.log("👤 Migrating users...");
    const users = db.prepare("SELECT * FROM users").all();
    await uploadTable("users", users);
  }

  // Resources
  if (TABLE === "all" || TABLE === "resources") {
    console.log("\n📦 Migrating resources...");
    const resources = db.prepare("SELECT * FROM resources").all();
    await uploadTable("resources", resources, transformResource);
  }

  // Shifts
  if (TABLE === "all" || TABLE === "shifts") {
    console.log("\n🕐 Migrating shifts...");
    const shifts = db.prepare("SELECT * FROM shifts").all();
    await uploadTable("shifts", shifts, (s: any) => ({
      ...s,
      is_all_day: boolCol(s.is_all_day) ?? false,
    }));
  }

  // Occurrences
  if (TABLE === "all" || TABLE === "occurrences") {
    console.log("\n📅 Migrating occurrences...");
    const occurrences = db.prepare("SELECT * FROM occurrences").all();
    await uploadTable("occurrences", occurrences, (o: any) => ({
      ...o,
      shift_id:  o.shift_id  || null,
      confirmed: boolCol(o.confirmed) ?? false,
      skipped:   boolCol(o.skipped)   ?? false,
    }));
  }

  // Resource tags
  if (TABLE === "all" || TABLE === "tags") {
    console.log("\n🏷  Migrating resource_tags...");
    const tags = db.prepare("SELECT * FROM resource_tags").all();
    let tagCount = 0;
    for (let i = 0; i < tags.length; i += BATCH) {
    const batch = tags.slice(i, i + BATCH);
    const { error } = await supabase
        .from("resource_tags")
        .insert(batch, { count: "exact" });
    if (error) {
        console.error(`  ✗ Batch ${i}-${i+BATCH}: ${error.message}`);
    } else {
        tagCount += batch.length;
        const pct = Math.round((tagCount / tags.length) * 100);
        process.stdout.write(`\r  ${pct}%  ${tagCount}/${tags.length} rows`);
    }
    }
    console.log(`\n  ✓ ${tagCount} rows uploaded to resource_tags`);
  }

  // Reviews
  if (TABLE === "all" || TABLE === "reviews") {
    console.log("\n⭐ Migrating reviews...");
    const reviews = db.prepare("SELECT * FROM reviews").all();
    await uploadTable("reviews", reviews, transformReview);
  }

  // AI summaries
  if (TABLE === "all" || TABLE === "summaries") {
    console.log("\n🤖 Migrating ai_summaries...");
    const summaries = db.prepare("SELECT * FROM ai_summaries").all();
    await uploadTable("ai_summaries", summaries, (s: any) => ({
      ...s,
      summary_json: (() => { try { return JSON.parse(s.summary_json ?? "{}"); } catch { return {}; } })(),
    }));
  }

  console.log("\n✅ Migration complete");
  db.close();
}

main().catch(err => {
  console.error("\nFatal:", err);
  process.exit(1);
});