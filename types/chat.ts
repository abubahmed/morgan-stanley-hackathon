export type IntentMode = 1 | 2 | 3 | 4;

export type IntentResult =
  | { kind: "conversation" }
  | { kind: "analysis"; mode: IntentMode }
  | { kind: "lookup" };

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

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: IntentMode;
  sandboxResult?: SandboxResult;
  isAnalysis?: boolean;
  isLoading?: boolean;
  error?: string;
  timestamp?: number;
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
