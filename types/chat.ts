export type AIMode = "query" | "exploration" | "investigation";

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
  reportIndex?: number;
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
  _id?: string;
  id?: string;
  clerkId: string;
  name: string;
  email?: string;
  imageUrl?: string;
  organization?: string;
  role?: "community" | "researcher" | "admin" | "coordinator";
  createdAt: number;
  updatedAt?: number;
}

export interface AnalysisResult {
  answer: string;
  images: string[]; // URL paths to images (e.g. /api/images/<id>)
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  analysisResults: AnalysisResult[];
  createdAt: number;
  updatedAt: number;
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
