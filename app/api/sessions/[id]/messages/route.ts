import { NextRequest, NextResponse } from "next/server";
import { saveMessage } from "@/lib/db";
import type { ChatMessage } from "@/types/chat";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { message } = (await req.json()) as { message: ChatMessage };
  try {
    await saveMessage(id, {
      id: message.id,
      role: message.role,
      content: message.content,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save message";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
