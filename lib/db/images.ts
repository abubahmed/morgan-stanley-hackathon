import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

const COLLECTION = "images";

interface ImageDoc {
  _id?: ObjectId;
  data: string; // base64 PNG
  createdAt: number;
}

/** Save a base64 PNG string to MongoDB and return its ID. */
export async function saveImage(base64: string): Promise<string> {
  const db = await getDb();
  const doc: ImageDoc = { data: base64, createdAt: Date.now() };
  const result = await db.collection<ImageDoc>(COLLECTION).insertOne(doc);
  return result.insertedId.toHexString();
}

/** Retrieve a base64 PNG string by its ID. */
export async function getImage(id: string): Promise<string | null> {
  const db = await getDb();
  const doc = await db.collection<ImageDoc>(COLLECTION).findOne({ _id: new ObjectId(id) });
  return doc?.data ?? null;
}
