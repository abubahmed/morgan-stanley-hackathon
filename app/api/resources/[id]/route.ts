import { NextRequest, NextResponse } from "next/server";
import { getResourceById } from "@/lib/lemontree_api";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const resource = await getResourceById(id);
    return NextResponse.json({ resource });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Resource not found" },
      { status: 404 }
    );
  }
}
