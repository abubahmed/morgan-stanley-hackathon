import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  createConversation,
  getUserConversations,
  deleteConversation,
} from "@/lib/db/conversations";

// Legacy sessions API — now backed by MongoDB conversations

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  const userId = clerkId ?? req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  const conversations = await getUserConversations(userId);
  const sessions = conversations.map((c) => ({
    id: c._id!.toString(),
    userId,
    title: c.title,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    messageCount: c.messages.length,
  }));
  return NextResponse.json({ sessions });
}

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  const body = await req.json();
  const userId = clerkId ?? body.userId;
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  const conv = await createConversation(userId, body.title);
  return NextResponse.json({
    session: {
      id: conv._id!.toString(),
      userId,
      title: conv.title,
      messages: [],
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messageCount: 0,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }
  const deleted = await deleteConversation(sessionId);
  return NextResponse.json({ deleted });
}
