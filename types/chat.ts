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
}

export interface KpiStat {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "neutral";
}
