import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { ChatMessage, AnalysisResult } from "@/types/chat";

const COLLECTION = "conversations";

export interface ConversationDoc {
  _id?: ObjectId;
  userId: string; // Clerk user ID
  title: string;
  messages: ChatMessage[];
  analysisResults: AnalysisResult[];
  createdAt: number;
  updatedAt: number;
}

export async function createConversation(userId: string, title = "New Chat"): Promise<ConversationDoc> {
  const db = await getDb();
  const now = Date.now();
  const doc: ConversationDoc = {
    userId,
    title,
    messages: [],
    analysisResults: [],
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection<ConversationDoc>(COLLECTION).insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function getUserConversations(userId: string): Promise<ConversationDoc[]> {
  const db = await getDb();
  return db
    .collection<ConversationDoc>(COLLECTION)
    .find({ userId })
    .sort({ updatedAt: -1 })
    .toArray();
}

export async function getConversation(id: string): Promise<ConversationDoc | null> {
  const db = await getDb();
  return db.collection<ConversationDoc>(COLLECTION).findOne({ _id: new ObjectId(id) });
}

export async function updateConversation(
  id: string,
  update: Partial<Pick<ConversationDoc, "title" | "messages" | "analysisResults">>
): Promise<ConversationDoc | null> {
  const db = await getDb();
  const result = await db.collection<ConversationDoc>(COLLECTION).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...update, updatedAt: Date.now() } },
    { returnDocument: "after" }
  );
  return result;
}

export async function deleteConversation(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<ConversationDoc>(COLLECTION).deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}
