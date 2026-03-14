import type { IntentMode, SandboxResult } from "@/types/chat";

export interface SandboxRequest {
  query: string;
  mode: IntentMode;
}

/**
 * Real sandbox trigger — calls Abu's e2b agent.
 * Falls back to mock data if E2B_API_KEY is not set.
 */
export async function triggerSandbox(request: SandboxRequest): Promise<SandboxResult> {
  if (!process.env.E2B_API_KEY) {
    await new Promise((res) => setTimeout(res, 1500));
    return MOCK_RESULTS[request.mode];
  }

  const { runAgent } = await import("@/sandbox/agent");
  const report = await runAgent(request.query);
  return {
    summary: report?.answer ?? "No analysis result returned.",
    chartData: null,
  };
}

// ---------------------------------------------------------------------------
// Stub data — replace with real sandbox output
// ---------------------------------------------------------------------------

const MOCK_RESULTS: Record<IntentMode, SandboxResult> = {
  1: {
    summary:
      "Over the last month, the Downtown Pantry recorded 347 visits — up 12% from 310 the month prior. Peak demand falls on Mondays (avg 18 visits/day). First-time visitors account for 31% of traffic.",
    chartData: {
      type: "bar",
      title: "Monthly Visits — Downtown Pantry",
      xKey: "month",
      yKey: "visits",
      data: [
        { month: "Oct", visits: 289 },
        { month: "Nov", visits: 310 },
        { month: "Dec", visits: 347 },
      ],
    },
  },
  2: {
    summary:
      "Across the network, visit frequency peaks on Mondays and Thursdays. Winter months see a 23% increase in first-time visitors. Three pantries account for 61% of all visits, suggesting uneven geographic coverage.",
    chartData: {
      type: "line",
      title: "Weekly Visit Patterns (Last 90 Days)",
      xKey: "day",
      yKey: "visits",
      data: [
        { day: "Mon", visits: 142 },
        { day: "Tue", visits: 98 },
        { day: "Wed", visits: 117 },
        { day: "Thu", visits: 135 },
        { day: "Fri", visits: 103 },
        { day: "Sat", visits: 89 },
        { day: "Sun", visits: 44 },
      ],
    },
  },
  3: {
    summary:
      "The Riverside Pantry's lower traffic is primarily explained by transit access: 67% of surveyed visitors rely on public transit, but the nearest stop is 0.8 miles away. Pantries with stops within 0.25 miles average 2.4× more visits.",
    chartData: {
      type: "pie",
      title: "Transportation Mode — Riverside Pantry Visitors",
      xKey: "mode",
      yKey: "pct",
      data: [
        { mode: "Public transit", pct: 67 },
        { mode: "Personal vehicle", pct: 18 },
        { mode: "Walking", pct: 11 },
        { mode: "Other", pct: 4 },
      ],
    },
  },
  4: {
    summary:
      "Feedback received and logged. This insight has been tagged for the pantry network coordinators' next review cycle. Thank you for helping improve food access data quality.",
    chartData: null,
  },
};
