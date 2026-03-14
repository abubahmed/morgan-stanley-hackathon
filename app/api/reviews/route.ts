import { NextRequest, NextResponse } from "next/server";
import { getReviewsForResource } from "@/lib/reviews";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const resourceId = searchParams.get("resourceId");
  const count = parseInt(searchParams.get("count") ?? "8", 10);

  if (!resourceId) {
    return NextResponse.json({ error: "resourceId is required" }, { status: 400 });
  }

  const reviews = getReviewsForResource(resourceId, count);
  return NextResponse.json({ reviews });
}
