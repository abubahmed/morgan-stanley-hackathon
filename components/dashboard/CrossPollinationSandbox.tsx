"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Map, TrendingUp, Play, Layers, Check } from "lucide-react";

type VizType = "bar" | "map" | "trend";

const DATASETS = [
  "Food Distribution Volume", "Poverty Rates by Zip",
  "Partner Demand Requests",  "Food Waste Metrics",
  "Community Demographics",   "Delivery Routes & Times",
];

const VIZ_OPTIONS: { type: VizType; label: string; Icon: React.ElementType }[] = [
  { type: "bar",   label: "Bar",   Icon: BarChart3  },
  { type: "map",   label: "Map",   Icon: Map        },
  { type: "trend", label: "Trend", Icon: TrendingUp },
];

export default function CrossPollinationSandbox() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [vizType, setVizType] = useState<VizType>("bar");

  function toggle(ds: string) {
    setSelected((prev) => prev.includes(ds) ? prev.filter((d) => d !== ds) : [...prev, ds]);
  }

  function handleRun() {
    if (selected.length === 0) return;
    router.push(`/sandbox?q=${encodeURIComponent(`Analyze and compare: ${selected.join(", ")} using a ${vizType} visualization`)}`);
  }

  return (
    <div
      className="rounded-2xl bg-white p-5"
      style={{ border: "1px solid rgba(210,195,165,0.45)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
    >
      <div className="mb-1 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: "linear-gradient(135deg, #C8EDE8 0%, #A8DDD6 100%)" }}>
          <Layers size={13} style={{ color: "#1E9080" }} />
        </div>
        <p className="text-[14px] font-semibold" style={{ color: "#1E2D3D" }}>Cross-Pollination Sandbox</p>
      </div>
      <p className="mb-4 text-xs leading-relaxed" style={{ color: "#8A9AAA" }}>
        Combine datasets to uncover hidden correlations. Layer variables to see what stories emerge.
      </p>

      <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#9AAAB8" }}>
        Datasets
      </p>
      <div className="flex flex-wrap gap-1.5">
        {DATASETS.map((ds) => {
          const on = selected.includes(ds);
          return (
            <button
              key={ds}
              onClick={() => toggle(ds)}
              className="rounded-full px-3 py-1 text-[11px] font-medium transition-all hover:-translate-y-px"
              style={on
                ? { background: "linear-gradient(135deg, #3DBFAC 0%, #27A090 100%)", color: "white", boxShadow: "0 2px 8px rgba(61,191,172,0.3)" }
                : { background: "linear-gradient(145deg, #F8F2E4 0%, #F2EAD4 100%)", border: "1px solid rgba(200,190,165,0.5)", color: "#5A6E7D" }
              }
            >
              {on && <Check size={10} className="shrink-0" />}{ds}
            </button>
          );
        })}
      </div>

      <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#9AAAB8" }}>
        Visualization
      </p>
      <div className="flex gap-2">
        {VIZ_OPTIONS.map(({ type, label, Icon }) => (
          <button
            key={type}
            onClick={() => setVizType(type)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-semibold transition-all"
            style={vizType === type
              ? { background: "linear-gradient(135deg, #3DBFAC 0%, #27A090 100%)", color: "white", boxShadow: "0 2px 8px rgba(61,191,172,0.25)" }
              : { background: "linear-gradient(145deg, #F8F2E4 0%, #F2EAD4 100%)", border: "1px solid rgba(200,190,165,0.4)", color: "#5A6E7D" }
            }
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={handleRun}
        disabled={selected.length === 0}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold text-white transition-all hover:shadow-md hover:-translate-y-px disabled:opacity-35 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
        style={{ background: "linear-gradient(135deg, #3DBFAC 0%, #1A8E80 100%)" }}
      >
        <Play size={13} />
        Run Analysis
      </button>
    </div>
  );
}
