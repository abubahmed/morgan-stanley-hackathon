import { NextRequest, NextResponse } from "next/server";
import { createSession, getUserSessions, deleteSession } from "@/lib/chatStore";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  const sessions = getUserSessions(userId);
  const lightweight = sessions.map(({ messages, ...rest }) => ({
    ...rest,
    messageCount: messages.length,
  }));
  return NextResponse.json({ sessions: lightweight });
}

export async function POST(req: NextRequest) {
  const { userId, title } = (await req.json()) as { userId: string; title?: string };
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  const session = createSession(userId, title);
  return NextResponse.json({ session });
}

export async function DELETE(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }
  const deleted = deleteSession(sessionId);
  return NextResponse.json({ deleted });
}
