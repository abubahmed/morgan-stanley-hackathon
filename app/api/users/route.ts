import { NextRequest, NextResponse } from "next/server";
import { upsertUser, getUser } from "@/lib/chatStore";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  const user = getUser(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ user });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const user = upsertUser(body);
  return NextResponse.json({ user });
}
