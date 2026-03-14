"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type VizType = "bar" | "map" | "trend";

const DATASETS = [
  "Food Distribution Volume",
  "Poverty Rates by Zip",
  "Partner Demand Requests",
  "Food Waste Metrics",
  "Community Demographics",
  "Delivery Routes & Times",
];

export default function CrossPollinationSandbox() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [vizType, setVizType] = useState<VizType>("bar");

  function toggle(ds: string) {
    setSelected((prev) =>
      prev.includes(ds) ? prev.filter((d) => d !== ds) : [...prev, ds]
    );
  }

  function handleRun() {
    if (selected.length === 0) return;
    const query = `Analyze and compare: ${selected.join(", ")} using a ${vizType} visualization`;
    router.push(`/sandbox?q=${encodeURIComponent(query)}`);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-gray-800">Cross-Pollination Sandbox</p>
      <p className="mt-1 text-xs text-gray-500">
        Combine datasets to uncover hidden correlations. Layer any two or more variables to see
        what stories emerge.
      </p>

      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Select datasets to combine
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {DATASETS.map((ds) => (
          <button
            key={ds}
            onClick={() => toggle(ds)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              selected.includes(ds)
                ? "bg-lt-green-600 text-white"
                : "border border-gray-300 text-gray-600 hover:border-lt-green-400"
            }`}
          >
            {selected.includes(ds) ? "✓ " : "+ "}{ds}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Visualization type
      </p>
      <div className="mt-2 flex gap-2">
        {(["bar", "map", "trend"] as VizType[]).map((t) => (
          <button
            key={t}
            onClick={() => setVizType(t)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              vizType === t
                ? "bg-lt-green-600 text-white"
                : "border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t === "bar" ? "📊 Bar Chart" : t === "map" ? "🗺️ Map View" : "📈 Trend Line"}
          </button>
        ))}
      </div>

      <button
        onClick={handleRun}
        disabled={selected.length === 0}
        className="mt-4 w-full rounded-lg bg-lt-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-lt-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Run Analysis →
      </button>
    </div>
  );
}
