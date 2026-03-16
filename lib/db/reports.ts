import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { AnalysisResult } from "@/types/chat";

const COLLECTION = "reports";

export interface ReportDoc {
  _id?: ObjectId;
  userId: string;
  conversationId: string;
  answer: string;
  images: string[];
  createdAt: number;
}

export async function createReport(
  userId: string,
  conversationId: string,
  result: AnalysisResult
): Promise<ReportDoc> {
  const db = await getDb();
  const doc: ReportDoc = {
    userId,
    conversationId,
    answer: result.answer,
    images: result.images,
    createdAt: Date.now(),
  };
  const res = await db.collection<ReportDoc>(COLLECTION).insertOne(doc);
  return { ...doc, _id: res.insertedId };
}

export async function getReportsByConversation(conversationId: string): Promise<ReportDoc[]> {
  const db = await getDb();
  return db
    .collection<ReportDoc>(COLLECTION)
    .find({ conversationId })
    .sort({ createdAt: 1 })
    .toArray();
}

export async function getUserReports(userId: string): Promise<ReportDoc[]> {
  const db = await getDb();
  return db
    .collection<ReportDoc>(COLLECTION)
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function deleteReportsByConversation(conversationId: string): Promise<number> {
  const db = await getDb();
  const result = await db.collection<ReportDoc>(COLLECTION).deleteMany({ conversationId });
  return result.deletedCount;
}
