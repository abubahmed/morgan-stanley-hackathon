import type { ChatSession, ChatMessage, UserInfo } from "@/types/chat";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// ── Sessions (backed by conversations collection) ──

export async function createSession(userId: string, title = "New Chat"): Promise<ChatSession> {
  const db = await getDb();
  const now = Date.now();
  const doc = {
    userId,
    title,
    messages: [] as ChatMessage[],
    analysisResults: [],
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection("conversations").insertOne(doc);
  return {
    id: result.insertedId.toString(),
    userId,
    title,
    messages: [],
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };
}

export async function getSession(sessionId: string): Promise<ChatSession | null> {
  const db = await getDb();
  let doc;
  try {
    doc = await db.collection("conversations").findOne({ _id: new ObjectId(sessionId) });
  } catch {
    return null;
  }
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    userId: doc.userId as string,
    title: doc.title as string,
    messages: (doc.messages as ChatMessage[]) ?? [],
    createdAt: doc.createdAt as number,
    updatedAt: doc.updatedAt as number,
    messageCount: ((doc.messages as ChatMessage[]) ?? []).length,
  };
}

export async function getUserSessions(userId: string): Promise<ChatSession[]> {
  const db = await getDb();
  const docs = await db
    .collection("conversations")
    .find({ userId })
    .sort({ updatedAt: -1 })
    .toArray();
  return docs.map((doc) => ({
    id: doc._id.toString(),
    userId: doc.userId as string,
    title: doc.title as string,
    messages: (doc.messages as ChatMessage[]) ?? [],
    createdAt: doc.createdAt as number,
    updatedAt: doc.updatedAt as number,
    messageCount: ((doc.messages as ChatMessage[]) ?? []).length,
  }));
}

export async function addMessageToSession(sessionId: string, message: ChatMessage): Promise<ChatSession | null> {
  const db = await getDb();
  let oid;
  try {
    oid = new ObjectId(sessionId);
  } catch {
    return null;
  }

  const doc = await db.collection("conversations").findOne({ _id: oid });
  if (!doc) return null;

  const messages = [...((doc.messages as ChatMessage[]) ?? []), message];
  let title = doc.title as string;
  if (title === "New Chat" && message.role === "user") {
    title = message.content.length > 50 ? message.content.slice(0, 47) + "..." : message.content;
  }

  await db.collection("conversations").updateOne(
    { _id: oid },
    { $set: { messages, title, updatedAt: Date.now(), messageCount: messages.length } }
  );

  return {
    id: sessionId,
    userId: doc.userId as string,
    title,
    messages,
    createdAt: doc.createdAt as number,
    updatedAt: Date.now(),
    messageCount: messages.length,
  };
}

export async function renameSession(sessionId: string, title: string): Promise<ChatSession | null> {
  const db = await getDb();
  let oid;
  try {
    oid = new ObjectId(sessionId);
  } catch {
    return null;
  }
  const result = await db.collection("conversations").findOneAndUpdate(
    { _id: oid },
    { $set: { title, updatedAt: Date.now() } },
    { returnDocument: "after" }
  );
  if (!result) return null;
  return {
    id: result._id.toString(),
    userId: result.userId as string,
    title: result.title as string,
    messages: (result.messages as ChatMessage[]) ?? [],
    createdAt: result.createdAt as number,
    updatedAt: result.updatedAt as number,
    messageCount: ((result.messages as ChatMessage[]) ?? []).length,
  };
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  const db = await getDb();
  let oid;
  try {
    oid = new ObjectId(sessionId);
  } catch {
    return false;
  }
  const result = await db.collection("conversations").deleteOne({ _id: oid });
  return result.deletedCount === 1;
}

// ── Users ──

export async function upsertUser(input: Omit<UserInfo, "clerkId" | "createdAt"> & { clerkId?: string }): Promise<UserInfo> {
  const db = await getDb();
  const col = db.collection("users");
  const now = Date.now();

  if (input.clerkId) {
    const result = await col.findOneAndUpdate(
      { clerkId: input.clerkId },
      {
        $set: { name: input.name, email: input.email, organization: input.organization, role: input.role, updatedAt: now },
        $setOnInsert: { clerkId: input.clerkId, createdAt: now },
      },
      { upsert: true, returnDocument: "after" }
    );
    return result as unknown as UserInfo;
  }

  if (input.email) {
    const existing = await col.findOne({ email: input.email });
    if (existing) {
      await col.updateOne({ _id: existing._id }, { $set: { ...input, updatedAt: now } });
      return { ...existing, ...input, createdAt: existing.createdAt as number } as unknown as UserInfo;
    }
  }

  const { _id, ...rest } = input;
  const user = { ...rest, clerkId: rest.clerkId ?? "", createdAt: now, updatedAt: now };
  await col.insertOne(user);
  return user as unknown as UserInfo;
}

export async function getUser(userId: string): Promise<UserInfo | null> {
  const db = await getDb();
  const doc = await db.collection("users").findOne({ clerkId: userId });
  return doc as unknown as UserInfo | null;
}
