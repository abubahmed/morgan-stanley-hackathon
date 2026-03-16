import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  createConversation,
  getUserConversations,
  updateConversation,
  deleteConversation,
} from "@/lib/db/conversations";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversations = await getUserConversations(userId);
  // Return lightweight list (no messages/analysisResults) for sidebar
  const list = conversations.map((c) => ({
    id: c._id!.toString(),
    title: c.title,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    messageCount: c.messages.length,
    reportCount: c.analysisResults.length,
  }));
  return NextResponse.json({ conversations: list });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const conv = await createConversation(userId, body.title);
  return NextResponse.json({
    conversation: {
      id: conv._id!.toString(),
      title: conv.title,
      messages: conv.messages,
      analysisResults: conv.analysisResults,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    },
  });
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, title, messages, analysisResults } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (title !== undefined) update.title = title;
  if (messages !== undefined) update.messages = messages;
  if (analysisResults !== undefined) update.analysisResults = analysisResults;

  const conv = await updateConversation(id, update);
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    conversation: {
      id: conv._id!.toString(),
      title: conv.title,
      messages: conv.messages,
      analysisResults: conv.analysisResults,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const deleted = await deleteConversation(id);
  return NextResponse.json({ deleted });
}
