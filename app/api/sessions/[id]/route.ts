import { NextRequest, NextResponse } from "next/server";
import { getSessionMessages } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const messages = await getSessionMessages(id);
    return NextResponse.json({ messages });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch messages";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
