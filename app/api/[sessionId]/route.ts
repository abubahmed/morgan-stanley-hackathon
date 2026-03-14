import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  renameSession,
  deleteSession,
  addMessageToSession,
} from "@/lib/chatStore";
import type { ChatMessage } from "@/types/chat";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { sessionId } = await params;
  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json({ session });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { sessionId } = await params;
  const body = (await req.json()) as {
    title?: string;
    addMessage?: ChatMessage;
  };

  if (body.addMessage) {
    const session = addMessageToSession(sessionId, body.addMessage);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({ session });
  }

  if (body.title !== undefined) {
    const session = renameSession(sessionId, body.title);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({ session });
  }

  return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { sessionId } = await params;
  const ok = deleteSession(sessionId);
  if (!ok) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
