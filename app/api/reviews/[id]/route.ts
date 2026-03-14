/**
 * app/api/reviews/[id]/route.ts
 * PATCH /api/reviews/:id   — take an action on a review
 * DELETE /api/reviews/:id  — soft delete a review (admin only)
 *
 * PATCH body: { action: "clientFlag" | "resourceFlag" | "shareSocial" | "followUp" | "moderate" | "approvePhoto" }
 * For "moderate": also pass { inaccurate: boolean, inaccurateNote?: string, reviewerName: string }
 */

import { NextRequest, NextResponse } from "next/server";
import db from "@/db/client";
import { toReviewEntry } from "@/db/types";
import type { ReviewRow } from "@/db/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body   = await req.json();
  const { action } = body;

  try {
    const existing = db.prepare(
      "SELECT * FROM reviews WHERE id = ? AND deleted_at IS NULL"
    ).get(id) as ReviewRow | undefined;

    if (!existing) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    switch (action) {
      case "clientFlag":
        db.prepare(
          `UPDATE reviews SET client_flag_created = 1, status = 'Flagged' WHERE id = ?`
        ).run(id);
        break;

      case "resourceFlag":
        db.prepare(
          `UPDATE reviews SET resource_flag_created = 1, status = 'Flagged' WHERE id = ?`
        ).run(id);
        break;

      case "shareSocial":
        db.prepare(
          `UPDATE reviews SET shared_social = 1 WHERE id = ?`
        ).run(id);
        break;

      case "followUp":
        db.prepare(
          `UPDATE reviews SET follow_up_sent = 1 WHERE id = ?`
        ).run(id);
        break;

      case "moderate": {
        const { inaccurate, inaccurateNote, reviewerName } = body;
        db.prepare(`
          UPDATE reviews
          SET reviewed_by_name    = ?,
              moderation_date     = date('now'),
              information_accurate = ?,
              inaccurate_note     = ?,
              status              = 'Completed'
          WHERE id = ?
        `).run(
          reviewerName ?? "Admin",
          inaccurate ? 0 : 1,
          inaccurateNote ?? null,
          id
        );
        break;
      }

      case "approvePhoto":
        db.prepare(
          `UPDATE reviews SET photo_status = 'Approved', photo_public = 1 WHERE id = ?`
        ).run(id);
        break;

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    // Return the updated review in UI shape
    const updated = db.prepare(`
      SELECT rv.*, r.name as resource_name
      FROM reviews rv
      JOIN resources r ON r.id = rv.resource_id
      WHERE rv.id = ?
    `).get(id) as (ReviewRow & { resource_name: string }) | undefined;

    if (!updated) {
      return NextResponse.json({ error: "Review not found after update" }, { status: 404 });
    }

    return NextResponse.json({ review: toReviewEntry(updated, updated.resource_name) });
  } catch (err) {
    console.error(`[PATCH /api/reviews/${id}]`, err);
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = db.prepare(
      `UPDATE reviews SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`
    ).run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`[DELETE /api/reviews/${id}]`, err);
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 });
  }
}