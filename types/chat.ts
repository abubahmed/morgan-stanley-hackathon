export type IntentMode = 1 | 2 | 3 | 4;

export type AIMode = "query" | "exploration" | "investigation";

export type UserRole =
  | "food_bank_partner"
  | "government_policy"
  | "donor"
  | "volunteer"
  | "researcher"
  | "community";

export type IntentResult =
  | { kind: "conversation" }
  | { kind: "analysis"; mode: IntentMode }
  | { kind: "lookup" };

// Shape the real sandbox must conform to
export interface SandboxChartData {
  type: "bar" | "line" | "pie" | "scatter";
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>[];
  xKey?: string;
  yKey?: string;
}

export interface SandboxResult {
  summary: string;
  chartData: SandboxChartData | null;
}

export interface ChartSpec {
  type: "bar" | "line" | "pie";
  title: string;
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  color?: string;
}

export interface MapSpec {
  title: string;
  markers: { lat: number; lng: number; label?: string; color?: string }[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: IntentMode;
  aiMode?: AIMode;
  sandboxResult?: SandboxResult;
  charts?: ChartSpec[];
  maps?: MapSpec[];
  isAnalysis?: boolean;
  isLoading?: boolean;
  isStreaming?: boolean;
  error?: string;
}
