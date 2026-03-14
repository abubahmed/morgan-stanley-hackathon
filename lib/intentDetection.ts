import type { IntentMode, IntentResult } from "@/types/chat";

/**
 * Rule-based intent classifier.
 *
 * kind: "lookup"       — find/locate pantries or resources
 * kind: "analysis"     — data analysis query (modes 1–4)
 * kind: "conversation" — plain chat
 *
 * Mode 1 — Specific query:    "show me visits to X pantry last month"
 * Mode 2 — Vague exploration: "show me patterns around food access"
 * Mode 3 — Causal question:   "why is X pantry less popular?"
 * Mode 4 — Feedback:          "I think you should track wait times"
 */
export function detectIntent(message: string): IntentResult {
  const lower = message.toLowerCase();

  // ── Lookup (check before analysis — "show me pantries near X" would match Mode 1 otherwise)
  const lookupSignals = [
    /\b(find|locate|show me|where|nearest|closest|nearby)\b.{0,40}(pantry|pantries|food bank|food pantry|resource)/,
    /\b(pantry|pantries|food bank|food pantry)\b.{0,40}\b(near|in|around|by)\b/,
    /\b(open (now|today|tonight|this week))\b/,
    /\bwhere can i (get|find|access) food\b/,
    /\bfood (near|in|around|close to)\b/,
    /\b\d{5}\b/,                            // zip code
  ];
  if (lookupSignals.some((re) => re.test(lower))) {
    return { kind: "lookup" };
  }

  // ── Mode 3 — Causal/why (check early; "why" is unambiguous)
  if (
    /\bwhy\b/.test(lower) ||
    /what.{0,10}caus/.test(lower) ||
    /what.{0,10}driv/.test(lower) ||
    /reason\s+for\b/.test(lower)
  ) {
    return { kind: "analysis", mode: 3 };
  }

  // ── Mode 4 — Feedback ingestion
  const feedbackSignals = [
    /\bi think\b/, /\bfeedback\b/, /\bsuggestion\b/, /\byou should\b/,
    /\bwe should\b/, /\bit would be (better|good|helpful)\b/,
    /\bcould you (add|improve|change|update)\b/,
  ];
  if (feedbackSignals.some((re) => re.test(lower))) {
    return { kind: "analysis", mode: 4 };
  }

  // ── Mode 1 — Specific query: concrete data ask with a target
  const specificSignals = [
    /\bshow me\b.{0,40}(visits?|count|number|total|last (week|month|year|quarter))\b/,
    /\bhow many\b/,
    /\blist (all|the)\b/,
    /\b(visits?|clients?|people)\b.{0,30}\b(to|at|in)\b.{0,30}pantry\b/,
    /\blast (week|month|year|quarter)\b/,
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/,
    /\b20\d\d\b/,
    /\bcompare\b.{0,40}(pantry|location|site)\b/,
    /\btop \d+\b/,
  ];
  if (specificSignals.some((re) => re.test(lower))) {
    return { kind: "analysis", mode: 1 };
  }

  // ── Mode 2 — Vague exploration: open-ended data curiosity
  const vagueSignals = [
    /\bpatterns?\b/, /\btrends?\b/, /\binsights?\b/, /\boverview\b/,
    /\bwhat.{0,15}(going on|happening|look like)\b/,
    /\btell me about\b/, /\bexplore\b/, /\binteresting\b/,
    /\bwhat (can you|do you) (see|find|know)\b/,
    /\bfood access\b/, /\banalyz(e|is)\b/, /\bsummary\b/,
  ];
  if (vagueSignals.some((re) => re.test(lower))) {
    return { kind: "analysis", mode: 2 };
  }

  return { kind: "conversation" };
}

export const MODE_LABELS: Record<IntentMode, string> = {
  1: "Specific Query",
  2: "Vague Exploration",
  3: "Causal Question",
  4: "Feedback",
};
