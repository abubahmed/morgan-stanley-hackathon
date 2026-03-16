import fs from "fs";
import path from "path";
import type { ChatSession, ChatMessage, UserInfo } from "@/types/chat";

const DATA_DIR = path.join(process.cwd(), ".chat-data");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON<T>(file: string, fallback: T): T {
  ensureDataDir();
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(file: string, data: unknown) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

export function createSession(userId: string, title = "New Chat"): ChatSession {
  const sessions = readJSON<Record<string, ChatSession>>(SESSIONS_FILE, {});
  const session: ChatSession = {
    id: crypto.randomUUID(),
    userId,
    title,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messageCount: 0,
  };
  sessions[session.id] = session;
  writeJSON(SESSIONS_FILE, sessions);
  return session;
}

export function getSession(sessionId: string): ChatSession | null {
  const sessions = readJSON<Record<string, ChatSession>>(SESSIONS_FILE, {});
  return sessions[sessionId] ?? null;
}

export function getUserSessions(userId: string): ChatSession[] {
  const sessions = readJSON<Record<string, ChatSession>>(SESSIONS_FILE, {});
  return Object.values(sessions)
    .filter((s) => s.userId === userId)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function addMessageToSession(sessionId: string, message: ChatMessage): ChatSession | null {
  const sessions = readJSON<Record<string, ChatSession>>(SESSIONS_FILE, {});
  const session = sessions[sessionId];
  if (!session) return null;

  session.messages.push(message);
  session.messageCount = session.messages.length;
  session.updatedAt = Date.now();

  if (session.title === "New Chat" && message.role === "user") {
    session.title = message.content.length > 50
      ? message.content.slice(0, 47) + "..."
      : message.content;
  }

  sessions[sessionId] = session;
  writeJSON(SESSIONS_FILE, sessions);
  return session;
}

export function renameSession(sessionId: string, title: string): ChatSession | null {
  const sessions = readJSON<Record<string, ChatSession>>(SESSIONS_FILE, {});
  if (!sessions[sessionId]) return null;
  sessions[sessionId].title = title;
  sessions[sessionId].updatedAt = Date.now();
  writeJSON(SESSIONS_FILE, sessions);
  return sessions[sessionId];
}

export function deleteSession(sessionId: string): boolean {
  const sessions = readJSON<Record<string, ChatSession>>(SESSIONS_FILE, {});
  if (!sessions[sessionId]) return false;
  delete sessions[sessionId];
  writeJSON(SESSIONS_FILE, sessions);
  return true;
}

export function upsertUser(input: Omit<UserInfo, "id" | "createdAt"> & { id?: string }): UserInfo {
  const users = readJSON<Record<string, UserInfo>>(USERS_FILE, {});

  if (input.id && users[input.id]) {
    users[input.id] = { ...users[input.id], ...input, id: input.id };
    writeJSON(USERS_FILE, users);
    return users[input.id];
  }

  if (input.email) {
    const existing = Object.values(users).find((u) => u.email === input.email);
    if (existing) {
      users[existing.id] = { ...existing, ...input, id: existing.id };
      writeJSON(USERS_FILE, users);
      return users[existing.id];
    }
  }

  const user: UserInfo = {
    id: input.id ?? crypto.randomUUID(),
    name: input.name,
    email: input.email,
    organization: input.organization,
    role: input.role,
    createdAt: Date.now(),
  };
  users[user.id] = user;
  writeJSON(USERS_FILE, users);
  return user;
}

export function getUser(userId: string): UserInfo | null {
  const users = readJSON<Record<string, UserInfo>>(USERS_FILE, {});
  return users[userId] ?? null;
}
