import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getConversation } from "@/lib/db/conversations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conv = await getConversation(id);
  if (!conv || conv.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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
