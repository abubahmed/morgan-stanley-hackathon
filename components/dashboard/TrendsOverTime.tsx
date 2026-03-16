"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TrendRow {
  year: string;
  medianIncome: number | null;
  povertyRate: number | null;
  snapRate: number | null;
  transitRate: number | null;
}

interface GeoOption {
  fips: string;
  name: string;
  stateFips?: string;
}

type Metric = "medianIncome" | "povertyRate" | "snapRate" | "transitRate";
type Level = "national" | "state" | "county";

const METRICS: { key: Metric; label: string; color: string; unit: string }[] = [
  { key: "medianIncome", label: "Median Income", color: "#3DBFAC", unit: "$" },
  { key: "povertyRate", label: "Poverty Rate", color: "#ef4444", unit: "%" },
  { key: "snapRate", label: "SNAP Usage", color: "#f59e0b", unit: "%" },
  { key: "transitRate", label: "Public Transit", color: "#8b5cf6", unit: "%" },
];

export default function TrendsOverTime() {
  const [data, setData] = useState<TrendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Set<Metric>>(new Set(["medianIncome", "povertyRate", "snapRate", "transitRate"]));

  const [level, setLevel] = useState<Level>("national");
  const [states, setStates] = useState<GeoOption[]>([]);
  const [counties, setCounties] = useState<GeoOption[]>([]);
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCounty, setSelectedCounty] = useState<string>("");

  useEffect(() => {
    fetch("/api/trends-over-time?list=states")
      .then((r) => r.json())
      .then((d: { states: GeoOption[] }) => setStates(d.states ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (level !== "county" || !selectedState) { setCounties([]); return; }
    fetch(`/api/trends-over-time?list=counties&fips=${selectedState}`)
      .then((r) => r.json())
      .then((d: { counties: GeoOption[] }) => setCounties(d.counties ?? []))
      .catch(() => {});
  }, [level, selectedState]);

  const fetchTrends = useCallback(() => {
    let url = "/api/trends-over-time?level=" + level;
    if (level === "state" && selectedState) url += `&fips=${selectedState}`;
    if (level === "county" && selectedCounty) url += `&fips=${selectedCounty}`;
    if (level === "state" && !selectedState) return;
    if (level === "county" && !selectedCounty) return;

    setLoading(true);
    fetch(url)
      .then((r) => r.json())
      .then((d: { trends: TrendRow[] }) => setData(d.trends ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [level, selectedState, selectedCounty]);

  useEffect(() => { fetchTrends(); }, [fetchTrends]);

  const toggle = (key: Metric) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else { next.add(key); }
      return next;
    });
  };

  const handleLevelChange = (newLevel: Level) => {
    setLevel(newLevel);
    if (newLevel === "national") { setSelectedState(""); setSelectedCounty(""); }
    else if (newLevel === "state") { setSelectedCounty(""); }
  };

  const activeMetrics = METRICS.filter((m) => active.has(m.key));
  const hasIncome = active.has("medianIncome");
  const hasPercent = active.has("povertyRate") || active.has("snapRate") || active.has("transitRate");
  const dualAxis = hasIncome && hasPercent;

  let subtitle = "National averages, 2014\u20132023";
  if (level === "state" && selectedState) {
    const s = states.find((s) => s.fips === selectedState);
    subtitle = s ? `${s.name}, 2014\u20132023` : subtitle;
  } else if (level === "county" && selectedCounty) {
    const c = counties.find((c) => c.fips === selectedCounty);
    subtitle = c ? `${c.name}, 2014\u20132023` : subtitle;
  }

  return (
    <div
      className="rounded-2xl bg-white p-5"
      style={{ border: "1px solid rgba(210,195,165,0.45)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>

      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <p className="text-[14px] font-semibold" style={{ color: "#1E2D3D" }}>Trends Over Time</p>
          <p className="text-xs mt-0.5" style={{ color: "#8A9AAA" }}>{loading ? "Loading..." : subtitle}</p>
        </div>

        {/* Geo selector */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1.5px solid #e5e7eb" }}>
            {(["national", "state", "county"] as Level[]).map((l) => (
              <button
                key={l}
                onClick={() => handleLevelChange(l)}
                className="px-3.5 py-1.5 text-[11px] font-semibold transition-all"
                style={{
                  backgroundColor: level === l ? "#3DBFAC" : "#fff",
                  color: level === l ? "#fff" : "#6b7280",
                }}
              >
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </button>
            ))}
          </div>

          {(level === "state" || level === "county") && (
            <select
              value={selectedState}
              onChange={(e) => { setSelectedState(e.target.value); setSelectedCounty(""); }}
              className="rounded-xl px-3 py-1.5 text-[11px] font-semibold outline-none appearance-none cursor-pointer"
              style={{ color: "#1E2D3D", backgroundColor: "#f9fafb", border: "1.5px solid #e5e7eb", minWidth: 120 }}
            >
              <option value="">State...</option>
              {states.map((s) => <option key={s.fips} value={s.fips}>{s.name}</option>)}
            </select>
          )}

          {level === "county" && selectedState && (
            <select
              value={selectedCounty}
              onChange={(e) => setSelectedCounty(e.target.value)}
              className="rounded-xl px-3 py-1.5 text-[11px] font-semibold outline-none appearance-none cursor-pointer"
              style={{ color: "#1E2D3D", backgroundColor: "#f9fafb", border: "1.5px solid #e5e7eb", minWidth: 140 }}
            >
              <option value="">County...</option>
              {counties.map((c) => <option key={c.fips} value={c.fips}>{c.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Metric toggles */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => toggle(m.key)}
            className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-[11px] font-semibold transition-all duration-150"
            style={{
              backgroundColor: active.has(m.key) ? m.color : "#f9fafb",
              color: active.has(m.key) ? "#fff" : "#6b7280",
              border: `1.5px solid ${active.has(m.key) ? m.color : "#e5e7eb"}`,
            }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: active.has(m.key) ? "#fff" : m.color }} />
            {m.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
          <defs>
            {METRICS.map((m) => (
              <linearGradient key={m.key} id={`grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={m.color} stopOpacity={0.15} />
                <stop offset="95%" stopColor={m.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            domain={["dataMin - 5", "auto"]}
            hide={dualAxis ? !hasPercent : !hasPercent && !hasIncome}
          />
          {dualAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              domain={["dataMin - 2000", "auto"]}
            />
          )}
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              fontSize: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              padding: "10px 14px",
            }}
            formatter={(value, name) => {
              const v = Number(value);
              const n = String(name);
              const metric = METRICS.find((m) => m.key === n);
              if (metric?.unit === "$") return [`$${v.toLocaleString()}`, metric.label];
              if (metric?.unit === "%") return [`${v}%`, metric.label];
              return [v, n];
            }}
          />
          {activeMetrics.map((m) => (
            <Area
              key={m.key}
              yAxisId={dualAxis && m.key === "medianIncome" ? "right" : "left"}
              type="monotone"
              dataKey={m.key}
              stroke={m.color}
              strokeWidth={2.5}
              fill={`url(#grad-${m.key})`}
              dot={{ r: 3, fill: "#fff", stroke: m.color, strokeWidth: 2 }}
              activeDot={{ r: 6, fill: m.color, stroke: "#fff", strokeWidth: 2 }}
              connectNulls
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
