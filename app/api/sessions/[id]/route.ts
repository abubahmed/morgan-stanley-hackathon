import { NextRequest, NextResponse } from "next/server";
import { getSessionMessages } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const messages = await getSessionMessages(params.id);
    return NextResponse.json({ messages });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to fetch messages";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
