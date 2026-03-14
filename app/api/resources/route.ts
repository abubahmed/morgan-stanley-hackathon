/**
 * app/api/resources/route.ts — Supabase version
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit      = Math.min(500, parseInt(searchParams.get("limit") ?? "200"));
  const zip        = searchParams.get("zip");
  const type       = searchParams.get("type");
  const openNow    = searchParams.get("openNow") === "true";

  try {
    let query = supabase
      .from("resources")
      .select("id, name, zip_code, resource_type, lat, lng, rating_avg, review_count, is_open_now, tag_names, contact_phone, image_url")
      .not("name", "is", null)
      .order("name", { ascending: true })
      .limit(limit);

    if (zip)    query = query.eq("zip_code", zip);
    if (type && type !== "ALL") query = query.eq("resource_type", type);
    if (openNow) query = query.eq("is_open_now", true);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      count:     (data ?? []).length,
      resources: data ?? [],
    });
  } catch (err) {
    console.error("[GET /api/resources]", err);
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
  }
}