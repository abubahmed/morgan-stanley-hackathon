import { supabase } from "./supabase";
import type { ChatMessage, IntentMode, SandboxResult } from "@/types/chat";

// ── Users ─────────────────────────────────────────────────────────────────────

export async function createUser(name = "anonymous") {
  const { data, error } = await supabase
    .from("users")
    .insert({ name, role: "community" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export interface SessionItem {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export async function createSession(userId: string, title = "New Chat") {
  const { data, error } = await supabase
    .from("sessions")
    .insert({ user_id: userId, title })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getUserSessions(userId: string): Promise<SessionItem[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, title, created_at, updated_at, message_count")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SessionItem[];
}

export async function updateSessionTitle(sessionId: string, title: string) {
  await supabase
    .from("sessions")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
}

// ── Messages ──────────────────────────────────────────────────────────────────

export async function saveMessage(
  sessionId: string,
  msg: {
    id: string;
    role: "user" | "assistant";
    content: string;
    isAnalysis?: boolean;
    mode?: IntentMode | null;
    sandboxResult?: SandboxResult | null;
  }
) {
  const { error } = await supabase.from("messages").insert({
    id: msg.id,
    session_id: sessionId,
    role: msg.role,
    content: msg.content,
    is_analysis: msg.isAnalysis ?? false,
    mode: msg.mode ?? null,
    sandbox_result: msg.sandboxResult ?? null,
  });
  if (error) throw error;

  await supabase
    .from("sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sessionId);
}

export async function getSessionMessages(
  sessionId: string
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    role: row.role as "user" | "assistant",
    content: row.content,
    isAnalysis: row.is_analysis,
    mode: row.mode ?? undefined,
    sandboxResult: row.sandbox_result ?? undefined,
  }));
}
