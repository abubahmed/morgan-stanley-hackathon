export type AIMode = "query" | "exploration" | "investigation";

export type IntentMode = 1 | 2 | 3 | 4;

export type IntentResult =
  | { kind: "conversation" }
  | { kind: "analysis"; mode: IntentMode }
  | { kind: "lookup" };

export interface SandboxChartData {
  type: "bar" | "line" | "pie" | "scatter";
  title: string;
  data: Record<string, unknown>[];
  xKey?: string;
  yKey?: string;
}

export interface SandboxResult {
  summary: string;
  chartData: SandboxChartData | null;
  images?: string[];
}

export type UserRole =
  | "food_bank_partner"
  | "government_policy"
  | "donor"
  | "volunteer"
  | "researcher"
  | "community";

export interface ChartSpec {
  type: "bar" | "line" | "pie";
  title: string;
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  color?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  charts?: ChartSpec[];
  mode?: AIMode;
  isStreaming?: boolean;
}

export interface KpiStat {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "neutral";
}

export interface MapSpec {
  title: string;
  markers: { lat: number; lng: number; label?: string; color?: string }[];
}

export interface UserInfo {
  id: string;
  name: string;
  email?: string;
  organization?: string;
  role?: "community" | "researcher" | "admin" | "coordinator";
  createdAt: number;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}
