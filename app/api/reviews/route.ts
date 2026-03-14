/**
 * app/api/reviews/route.ts — Supabase version
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { toReviewEntry } from "@/db/types";
import type { ReviewRow } from "@/db/types";
import { v4 as uuidv4 } from "uuid";

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status     = searchParams.get("status");
  const search     = searchParams.get("search") ?? "";
  const resourceId = searchParams.get("resourceId");

  try {
    let query = supabase
      .from("reviews")
      .select("*, resources(name)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (status)     query = query.eq("status", status);
    if (resourceId) query = query.eq("resource_id", resourceId);

    const { data: rows, error } = await query;
    if (error) throw error;

    let entries = (rows ?? []).map((r: any) =>
      toReviewEntry(
        {
          ...r,
          // Postgres booleans → match ReviewRow shape (0|1 not needed in Postgres
          // but toReviewEntry checks === 0/1 so we normalize here)
          attended:                r.attended              === true  ? 1 : r.attended === false ? 0 : null,
          information_accurate:    r.information_accurate  === true  ? 1 : r.information_accurate === false ? 0 : null,
          photo_public:            r.photo_public          === true  ? 1 : r.photo_public === false ? 0 : null,
          share_text_with_resource: r.share_text_with_resource ? 1 : 0,
          client_flag_created:     r.client_flag_created   ? 1 : 0,
          resource_flag_created:   r.resource_flag_created ? 1 : 0,
          shared_social:           r.shared_social         ? 1 : 0,
          follow_up_sent:          r.follow_up_sent        ? 1 : 0,
          is_synthetic:            r.is_synthetic          ? 1 : 0,
          is_open_now:             0,
          open_by_appointment:     0,
        } as ReviewRow,
        r.resources?.name ?? "Unknown"
      )
    );

    if (search) {
      const q = search.toLowerCase();
      entries = entries.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.referredBy.toLowerCase().includes(q)
      );
    }

    const { data: statsRow } = await supabase
      .from("reviews")
      .select("rating, raffle_tickets, status")
      .is("deleted_at", null);

    const rows2 = statsRow ?? [];
    const total        = rows2.length;
    const avgRating    = total ? rows2.reduce((s: number, r: any) => s + (r.rating ?? 0), 0) / total : 0;
    const totalTickets = rows2.reduce((s: number, r: any) => s + (r.raffle_tickets ?? 0), 0);
    const pendingCount = rows2.filter((r: any) => r.status === "Pending").length;

    return NextResponse.json({
      reviews: entries,
      stats: {
        total,
        avgRating:    Math.round(avgRating * 10) / 10,
        totalTickets,
        pendingCount,
      },
    });
  } catch (err) {
    console.error("[GET /api/reviews]", err);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      name, phoneNumber, resourceId, visitDate,
      attended, didNotAttendReason, rating,
      waitTimeMinutes, informationAccuracy,
      text, photoPublic, shareTextWithResource,
    } = body;

    if (!name?.trim())  return NextResponse.json({ error: "Name is required" },     { status: 400 });
    if (!resourceId)    return NextResponse.json({ error: "Resource is required" }, { status: 400 });
    if (!attended)      return NextResponse.json({ error: "Attendance is required" }, { status: 400 });

    const { data: resource, error: resErr } = await supabase
      .from("resources")
      .select("id, name")
      .eq("id", resourceId)
      .single();

    if (resErr || !resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const infoAccurate: boolean | null =
      informationAccuracy >= 4 ? true :
      informationAccuracy <= 2 ? false : null;

    const photoPublicBool: boolean | null =
      photoPublic === "yes" ? true :
      photoPublic === "no"  ? false : null;

    const shareText = shareTextWithResource === "yes";
    const attendedBool = attended === "yes";

    const tickets   = !rating ? 0 : rating >= 5 ? 5 : rating >= 4 ? 4 : rating >= 3 ? 3 : 2;
    const sentiment = !rating ? null : rating >= 4 ? "positive" : rating <= 2 ? "negative" : "neutral";

    const { error: insertErr } = await supabase.from("reviews").insert({
      id:                       uuidv4(),
      created_at:               visitDate ? new Date(visitDate).toISOString() : new Date().toISOString(),
      share_text_with_resource: shareText,
      author_id:                "anon_user",
      resource_id:              resourceId,
      attended:                 attendedBool,
      did_not_attend_reason:    attendedBool ? null : (didNotAttendReason ?? null),
      information_accurate:     infoAccurate,
      photo_public:             photoPublicBool,
      rating:                   rating ?? null,
      text:                     text?.trim() || null,
      wait_time_minutes:        waitTimeMinutes ? parseInt(waitTimeMinutes) : null,
      author_name:              name.trim(),
      status:                   "Pending",
      raffle_tickets:           tickets,
      referred_by:              phoneNumber?.trim() ? `Phone: ${phoneNumber.trim()}` : null,
      is_synthetic:             false,
      sentiment,
    });

    if (insertErr) throw insertErr;

    return NextResponse.json({ tickets, resourceName: resource.name }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/reviews]", err);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}