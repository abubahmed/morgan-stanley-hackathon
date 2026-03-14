/**
 * db/client.ts
 * Singleton SQLite connection for Next.js API routes.
 * Import { db } from "@/db/client" — server-side only.
 */

import Database from "better-sqlite3";
import path from "path";
import { createSchema } from "./schema";

const DB_PATH = path.join(process.cwd(), "data", "canopy.db");

const globalForDb = globalThis as unknown as { _canopyDb?: Database.Database };

export const db: Database.Database =
  globalForDb._canopyDb ??
  (() => {
    const instance = new Database(DB_PATH);
    createSchema(instance);   // idempotent — CREATE IF NOT EXISTS
    return instance;
  })();

if (process.env.NODE_ENV !== "production") {
  globalForDb._canopyDb = db;
}

export default db;