export type IntentMode = 1 | 2 | 3 | 4;

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

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: IntentMode;
  sandboxResult?: SandboxResult;
  isAnalysis?: boolean;
  isLoading?: boolean;
  error?: string;
}
