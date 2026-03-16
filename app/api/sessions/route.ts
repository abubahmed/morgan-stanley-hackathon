import { NextRequest, NextResponse } from "next/server";
import { getUserSessions, createSession } from "@/lib/db";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  try {
    const sessions = await getUserSessions(userId);
    return NextResponse.json({ sessions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch sessions";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId, title } = await req.json() as { userId: string; title?: string };
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  try {
    const session = await createSession(userId, title);
    return NextResponse.json({ session });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create session";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
