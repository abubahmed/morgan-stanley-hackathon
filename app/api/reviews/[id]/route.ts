/**
 * app/api/reviews/[id]/route.ts — Supabase version
 * PATCH /api/reviews/:id  — take an action on a review
 * DELETE /api/reviews/:id — soft delete
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { toReviewEntry } from "@/db/types";
import type { ReviewRow } from "@/db/types";

function normalize(r: any): ReviewRow {
  return {
    ...r,
    attended:                 r.attended              === true ? 1 : r.attended === false ? 0 : null,
    information_accurate:     r.information_accurate  === true ? 1 : r.information_accurate === false ? 0 : null,
    photo_public:             r.photo_public          === true ? 1 : r.photo_public === false ? 0 : null,
    share_text_with_resource: r.share_text_with_resource ? 1 : 0,
    client_flag_created:      r.client_flag_created   ? 1 : 0,
    resource_flag_created:    r.resource_flag_created ? 1 : 0,
    shared_social:            r.shared_social         ? 1 : 0,
    follow_up_sent:           r.follow_up_sent        ? 1 : 0,
    is_synthetic:             r.is_synthetic          ? 1 : 0,
  } as ReviewRow;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id }     = await params;
  const body       = await req.json();
  const { action } = body;

  try {
    const { data: existing, error: fetchErr } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    let update: Record<string, any> = {};

    switch (action) {
      case "clientFlag":
        update = { client_flag_created: true, status: "Flagged" };
        break;
      case "resourceFlag":
        update = { resource_flag_created: true, status: "Flagged" };
        break;
      case "shareSocial":
        update = { shared_social: true };
        break;
      case "followUp":
        update = { follow_up_sent: true };
        break;
      case "moderate": {
        const { inaccurate, inaccurateNote, reviewerName } = body;
        update = {
          reviewed_by_name:     reviewerName ?? "Admin",
          moderation_date:      new Date().toISOString().split("T")[0],
          information_accurate: !inaccurate,
          inaccurate_note:      inaccurateNote ?? null,
          status:               "Completed",
        };
        break;
      }
      case "approvePhoto":
        update = { photo_status: "Approved", photo_public: true };
        break;
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const { error: updateErr } = await supabase
      .from("reviews")
      .update(update)
      .eq("id", id);

    if (updateErr) throw updateErr;

    const { data: updated, error: refetchErr } = await supabase
      .from("reviews")
      .select("*, resources(name)")
      .eq("id", id)
      .single();

    if (refetchErr || !updated) {
      return NextResponse.json({ error: "Failed to fetch updated review" }, { status: 500 });
    }

    return NextResponse.json({
      review: toReviewEntry(normalize(updated), updated.resources?.name ?? "Unknown"),
    });

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
    const { error } = await supabase
      .from("reviews")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`[DELETE /api/reviews/${id}]`, err);
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 });
  }
}