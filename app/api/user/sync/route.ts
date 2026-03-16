import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { upsertUser } from "@/lib/db/users";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const dbUser = await upsertUser({
    clerkId: userId,
    name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "User",
    email: user.emailAddresses[0]?.emailAddress,
    imageUrl: user.imageUrl,
  });

  return NextResponse.json({ user: dbUser });
}
