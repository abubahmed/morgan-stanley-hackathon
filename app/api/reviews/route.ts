/**
 * app/api/reviews/route.ts
 * GET  /api/reviews  — list reviews for the reviews tab
 * POST /api/reviews  — submit a new review (matches Google Form fields exactly)
 */

import { NextRequest, NextResponse } from "next/server";
import db from "@/db/client";
import { toReviewEntry } from "@/db/types";
import type { ReviewRow } from "@/db/types";
import crypto from "crypto";

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status     = searchParams.get("status");
  const search     = searchParams.get("search") ?? "";
  const resourceId = searchParams.get("resourceId");

  try {
    let sql = `
      SELECT rv.*, r.name as resource_name
      FROM reviews rv
      JOIN resources r ON r.id = rv.resource_id
      WHERE rv.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (status)     { sql += ` AND rv.status = ?`;      params.push(status); }
    if (resourceId) { sql += ` AND rv.resource_id = ?`; params.push(resourceId); }

    sql += ` ORDER BY rv.created_at DESC`;

    const rows = db.prepare(sql).all(...params) as (ReviewRow & { resource_name: string })[];

    let entries = rows.map(r => toReviewEntry(r, r.resource_name));

    if (search) {
      const q = search.toLowerCase();
      entries = entries.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.referredBy.toLowerCase().includes(q)
      );
    }

    const statsRow = db.prepare(`
      SELECT COUNT(*) AS total,
             ROUND(AVG(rating), 1) AS avg_rating,
             SUM(raffle_tickets)   AS total_tickets,
             SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending_count
      FROM reviews WHERE deleted_at IS NULL
    `).get() as { total: number; avg_rating: number; total_tickets: number; pending_count: number };

    return NextResponse.json({
      reviews: entries,
      stats: {
        total:        statsRow.total,
        avgRating:    statsRow.avg_rating   ?? 0,
        totalTickets: statsRow.total_tickets ?? 0,
        pendingCount: statsRow.pending_count ?? 0,
      },
    });
  } catch (err) {
    console.error("[GET /api/reviews]", err);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
//
// Accepts all fields from the Google Form "Resource Visit Review":
//   name                  → author_name
//   phoneNumber           → stored in referred_by as "Phone: ..." (no phone col in spec)
//   resourceName          → used to look up resource_id by name, else stored as-is
//   visitDate             → stored in a note (occurrence_id is optional in spec)
//   attended              → spec: attended
//   didNotAttendReason    → spec: didNotAttendReason
//   rating                → spec: rating (1-5)
//   waitTimeMinutes       → spec: waitTimeMinutes
//   informationAccuracy   → 1-5 scale; >=4 maps to informationAccurate=1, <=2 → 0, else null
//   text                  → spec: text (additional comments)
//   photoPublic           → spec: photoPublic ("yes"/"no")
//   shareTextWithResource → spec: shareTextWithResource ("yes"/"no")

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
        name,
        phoneNumber,
        resourceId,        // ← now sent directly from the dropdown
        visitDate,
        attended,
        didNotAttendReason,
        rating,
        waitTimeMinutes,
        informationAccuracy,
        text,
        photoPublic,
        shareTextWithResource,
      } = body;
      
      if (!name?.trim())  return NextResponse.json({ error: "Name is required" },     { status: 400 });
      if (!resourceId)    return NextResponse.json({ error: "Resource is required" }, { status: 400 });
      if (!attended)      return NextResponse.json({ error: "Attendance is required" }, { status: 400 });
      
      const resource = db.prepare(
        `SELECT id, name FROM resources WHERE id = ?`
      ).get(resourceId) as { id: string; name: string } | undefined;
      
      if (!resource) {
        return NextResponse.json({ error: "Resource not found" }, { status: 404 });
      }

    // Map 1-5 accuracy scale → spec boolean (null = neutral 3)
    const infoAccurate: 0 | 1 | null =
      informationAccuracy >= 4 ? 1 :
      informationAccuracy <= 2 ? 0 : null;

    // Map photo public choice
    const photoPublicBool: 0 | 1 | null =
      photoPublic === "yes" ? 1 :
      photoPublic === "no"  ? 0 : null;

    // Map share text choice
    const shareText: 0 | 1 =
      shareTextWithResource === "yes" ? 1 : 0;

    const attendedBool: 0 | 1 = attended === "yes" ? 1 : 0;

    const id      = `rev_${crypto.randomBytes(10).toString("hex")}`;
    const tickets = !rating ? 0 : rating >= 5 ? 5 : rating >= 4 ? 4 : rating >= 3 ? 3 : 2;
    const sentiment =
      !rating ? null :
      rating >= 4 ? "positive" :
      rating <= 2 ? "negative" : "neutral";

    // Store phone in referred_by since spec has no phone field
    const referredByVal = phoneNumber?.trim()
      ? `Phone: ${phoneNumber.trim()}`
      : null;

    db.prepare(`
      INSERT INTO reviews (
        id, created_at,
        share_text_with_resource, author_id, resource_id,
        attended, did_not_attend_reason, information_accurate,
        photo_public, rating, text, wait_time_minutes,
        author_name, status, raffle_tickets,
        referred_by, is_synthetic, sentiment
      ) VALUES (
        @id, @created_at,
        @share_text_with_resource, @author_id, @resource_id,
        @attended, @did_not_attend_reason, @information_accurate,
        @photo_public, @rating, @text, @wait_time_minutes,
        @author_name, 'Pending', @raffle_tickets,
        @referred_by, 0, @sentiment
      )
    `).run({
      id,
      created_at:               visitDate
                                  ? new Date(visitDate).toISOString()
                                  : new Date().toISOString(),
      share_text_with_resource: shareText,
      author_id:                "anon_user",
      resource_id:              resourceId,
      attended:                 attendedBool,
      did_not_attend_reason:    attendedBool === 0 ? (didNotAttendReason ?? null) : null,
      information_accurate:     infoAccurate,
      photo_public:             photoPublicBool,
      rating:                   rating ?? null,
      text:                     text?.trim() || null,
      wait_time_minutes:        waitTimeMinutes ? parseInt(waitTimeMinutes) : null,
      author_name:              name.trim(),
      raffle_tickets:           tickets,
      referred_by:              referredByVal,
      sentiment,
    });

    return NextResponse.json({
      id,
      tickets,
      resourceName: resource.name,
    }, { status: 201 });

  } catch (err) {
    console.error("[POST /api/reviews]", err);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}