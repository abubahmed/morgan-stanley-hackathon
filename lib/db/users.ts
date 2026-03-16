import { getDb } from "@/lib/mongodb";
import type { UserInfo } from "@/types/chat";

const COLLECTION = "users";

export async function upsertUser(user: {
  clerkId: string;
  name: string;
  email?: string;
  imageUrl?: string;
  organization?: string;
  role?: UserInfo["role"];
}): Promise<UserInfo> {
  const db = await getDb();
  const col = db.collection<UserInfo>(COLLECTION);

  const now = Date.now();
  const result = await col.findOneAndUpdate(
    { clerkId: user.clerkId },
    {
      $set: {
        name: user.name,
        email: user.email,
        imageUrl: user.imageUrl,
        organization: user.organization,
        role: user.role,
        updatedAt: now,
      },
      $setOnInsert: {
        clerkId: user.clerkId,
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  return result!;
}

export async function getUserByClerkId(clerkId: string): Promise<UserInfo | null> {
  const db = await getDb();
  return db.collection<UserInfo>(COLLECTION).findOne({ clerkId });
}

export async function getUserById(id: string): Promise<UserInfo | null> {
  const db = await getDb();
  const { ObjectId } = await import("mongodb");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return db.collection<UserInfo>(COLLECTION).findOne({ _id: new ObjectId(id) } as any);
}
