import { NextRequest, NextResponse } from "next/server";
import db from "@/db/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(500, parseInt(searchParams.get("limit") ?? "200"));
  const zip   = searchParams.get("zip");
  const type  = searchParams.get("type");

  try {
    const conditions: string[] = ["name IS NOT NULL"];
    const params: (string | number)[] = [];

    if (zip)  { conditions.push("zip_code = ?"); params.push(zip); }
    if (type && type !== "ALL") { conditions.push("resource_type = ?"); params.push(type); }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const resources = db.prepare(`
      SELECT id, name, zip_code, resource_type, lat, lng,
             rating_avg, review_count, is_open_now, tag_names
      FROM resources
      ${where}
      ORDER BY name ASC
      LIMIT ?
    `).all(...params, limit) as any[];

    return NextResponse.json({
      count: resources.length,
      resources: resources.map(r => ({
        ...r,
        tag_names:   JSON.parse(r.tag_names ?? "[]"),
        is_open_now: r.is_open_now === 1,
      })),
    });
  } catch (err) {
    console.error("[GET /api/resources]", err);
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
  }
}