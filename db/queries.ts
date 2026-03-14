/**
 * db/queries.ts
 * Typed prepared statements for all common queries.
 * Import in API routes: import { q } from "@/db/queries"
 */

import { db } from "./client";
import type { ReviewRow, ResourceRow, ReviewStatsRow, AISummaryRow } from "./types";

export const q = {

  // ── Resources ──────────────────────────────────────────────────────────────

  resourceById: db.prepare<[string], ResourceRow>(
    `SELECT * FROM resources WHERE id = ?`
  ),

  resourcesByZip: db.prepare<[string], ResourceRow>(
    `SELECT * FROM resources WHERE zip_code = ? ORDER BY rating_avg DESC NULLS LAST`
  ),

  allResources: db.prepare<[], Pick<ResourceRow,
    "id" | "name" | "zip_code" | "lat" | "lng" |
    "resource_type" | "rating_avg" | "review_count" |
    "reliability_score" | "confidence" | "is_open_now" |
    "contact_phone" | "image_url" | "tag_names"
  >>(
    `SELECT id, name, zip_code, lat, lng, resource_type, rating_avg,
            review_count, reliability_score, confidence, is_open_now,
            contact_phone, image_url, tag_names
     FROM resources
     WHERE lat IS NOT NULL AND lng IS NOT NULL
     ORDER BY rating_avg DESC NULLS LAST`
  ),

  coverageByZip: db.prepare<[], { zip_code: string; count: number }>(
    `SELECT zip_code, COUNT(*) as count
     FROM resources WHERE zip_code IS NOT NULL
     GROUP BY zip_code ORDER BY count ASC`
  ),

  // ── Reviews ────────────────────────────────────────────────────────────────

  /** All non-deleted reviews with resource name — used by the UI review page */
  allReviewsWithResource: db.prepare<[], ReviewRow & { resource_name: string }>(
    `SELECT rv.*, r.name as resource_name
     FROM reviews rv
     JOIN resources r ON r.id = rv.resource_id
     WHERE rv.deleted_at IS NULL
     ORDER BY rv.created_at DESC`
  ),

  /** Reviews for a specific resource */
  reviewsByResource: db.prepare<[string, number], ReviewRow>(
    `SELECT * FROM reviews
     WHERE resource_id = ? AND deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT ?`
  ),

  /** Review texts for Claude summarizer */
  reviewTextsForResource: db.prepare<[string], { text: string }>(
    `SELECT text FROM reviews
     WHERE resource_id = ? AND text IS NOT NULL
       AND attended = 1 AND deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT 20`
  ),

  /** Single review by ID */
  reviewById: db.prepare<[string], ReviewRow>(
    `SELECT * FROM reviews WHERE id = ?`
  ),

  /** Reviews by status (for admin moderation queue) */
  reviewsByStatus: db.prepare<[string], ReviewRow & { resource_name: string }>(
    `SELECT rv.*, r.name as resource_name
     FROM reviews rv
     JOIN resources r ON r.id = rv.resource_id
     WHERE rv.status = ? AND rv.deleted_at IS NULL
     ORDER BY rv.created_at DESC`
  ),

  /** Aggregate stats for a resource */
  statsForResource: db.prepare<[string], ReviewStatsRow>(
    `SELECT * FROM resource_review_stats WHERE resource_id = ?`
  ),

  /** Global stats for the reviews page header */
  globalReviewStats: db.prepare<[], {
    total: number;
    avg_rating: number;
    total_tickets: number;
    pending_count: number;
  }>(
    `SELECT
       COUNT(*)                        AS total,
       ROUND(AVG(rating), 1)           AS avg_rating,
       SUM(raffle_tickets)             AS total_tickets,
       SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending_count
     FROM reviews WHERE deleted_at IS NULL`
  ),

  // ── Actions on reviews ─────────────────────────────────────────────────────

  updateStatus: db.prepare<[string, string]>(
    `UPDATE reviews SET status = ? WHERE id = ?`
  ),

  softDelete: db.prepare<[string]>(
    `UPDATE reviews SET deleted_at = datetime('now') WHERE id = ?`
  ),

  setClientFlag: db.prepare<[string]>(
    `UPDATE reviews SET client_flag_created = 1, status = 'Flagged' WHERE id = ?`
  ),

  setResourceFlag: db.prepare<[string]>(
    `UPDATE reviews SET resource_flag_created = 1, status = 'Flagged' WHERE id = ?`
  ),

  setSharedSocial: db.prepare<[string]>(
    `UPDATE reviews SET shared_social = 1 WHERE id = ?`
  ),

  setFollowUpSent: db.prepare<[string]>(
    `UPDATE reviews SET follow_up_sent = 1 WHERE id = ?`
  ),

  setModerated: db.prepare<[string, string, string, number, string | null]>(
    `UPDATE reviews
     SET reviewed_by_name = ?, moderation_date = date('now'),
         information_accurate = ?, inaccurate_note = ?,
         status = 'Completed'
     WHERE id = ?`
  ),

  setPhotoApproved: db.prepare<[string]>(
    `UPDATE reviews SET photo_status = 'Approved', photo_public = 1 WHERE id = ?`
  ),

  // ── Insert review ──────────────────────────────────────────────────────────

  insertReview: db.prepare(
    `INSERT INTO reviews (
       id, resource_id, author_id, author_name, status,
       rating, text, attended, did_not_attend_reason, wait_time_minutes,
       information_accurate, photo_url, photo_public,
       share_text_with_resource, referred_by, referred_role,
       raffle_tickets, occurrence_id, is_synthetic, sentiment
     ) VALUES (
       @id, @resource_id, @author_id, @author_name, @status,
       @rating, @text, @attended, @did_not_attend_reason, @wait_time_minutes,
       @information_accurate, @photo_url, @photo_public,
       @share_text_with_resource, @referred_by, @referred_role,
       @raffle_tickets, @occurrence_id, @is_synthetic, @sentiment
     )`
  ),

  // ── AI Summaries ───────────────────────────────────────────────────────────

  summaryByResource: db.prepare<[string], AISummaryRow>(
    `SELECT * FROM ai_summaries WHERE resource_id = ?`
  ),

  upsertSummary: db.prepare(
    `INSERT OR REPLACE INTO ai_summaries (resource_id, summary_json, generated_at)
     VALUES (@resource_id, @summary_json, @generated_at)`
  ),
};