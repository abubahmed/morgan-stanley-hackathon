"use client";

import { useState, useEffect, type KeyboardEvent } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Search } from "lucide-react";

interface Resource {
  name: string;
  rating: number;
  waitTime: number;
}

const VERTICAL_THRESHOLD = 8;

export default function ResourcesByZip() {
  const [zip, setZip] = useState("10002");
  const [data, setData] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(true);
  const [metric, setMetric] = useState<"rating" | "waitTime">("rating");

  function search() {
    const trimmed = zip.trim();
    if (!trimmed) return;
    setLoading(true);
    setSearched(true);
    fetch(`/api/resources-rated?zip=${trimmed}`)
      .then((r) => r.json())
      .then((result: Resource[]) => setData(Array.isArray(result) ? result : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }

  // Load default zip on mount
  useEffect(() => { search(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") search();
  }

  const sorted = [...data].sort((a, b) =>
    metric === "rating" ? b.rating - a.rating : b.waitTime - a.waitTime
  );
  const chartData = sorted.map((d) => ({ ...d, name: truncate(d.name, 22) }));
  const useVertical = data.length > VERTICAL_THRESHOLD;

  return (
    <div
      className="rounded-2xl bg-white p-5"
      style={{ border: "1px solid rgba(210,195,165,0.45)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[14px] font-semibold" style={{ color: "#1E2D3D" }}>
            Resources by ZIP Code
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#8A9AAA" }}>
            Enter a ZIP code to see resource ratings and wait times
          </p>
        </div>
        {data.length > 0 && (
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1.5px solid #e5e7eb" }}>
            <button
              onClick={() => setMetric("rating")}
              className="px-3.5 py-1.5 text-[11px] font-semibold transition-all"
              style={{
                backgroundColor: metric === "rating" ? "#3DBFAC" : "#fff",
                color: metric === "rating" ? "#fff" : "#6b7280",
              }}
            >
              Rating
            </button>
            <button
              onClick={() => setMetric("waitTime")}
              className="px-3.5 py-1.5 text-[11px] font-semibold transition-all"
              style={{
                backgroundColor: metric === "waitTime" ? "#3DBFAC" : "#fff",
                color: metric === "waitTime" ? "#fff" : "#6b7280",
              }}
            >
              Wait Time
            </button>
          </div>
        )}
      </div>

      {/* Search bar */}
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4"
        style={{ border: "1.5px solid rgba(210,195,165,0.5)", background: "#FAFAF5" }}
      >
        <Search size={14} style={{ color: "#B0C0CC" }} />
        <input
          type="text"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter ZIP code (e.g. 10001)"
          className="flex-1 bg-transparent text-[13px] outline-none"
          style={{ color: "#1E2D3D" }}
        />
        <button
          onClick={search}
          className="rounded-lg px-3 py-1 text-[11px] font-semibold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #3DBFAC 0%, #27A090 100%)" }}
        >
          Search
        </button>
      </div>

      {/* Chart or empty state */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-[12px]" style={{ color: "#8A9AAA" }}>Loading...</p>
        </div>
      ) : data.length > 0 ? (
        useVertical ? (
          /* Vertical bars when too many resources */
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={chartData} margin={{ left: 5, right: 5, top: 5, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(210,195,165,0.3)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9, fill: "#4A5E6D" }}
                axisLine={false}
                tickLine={false}
                angle={-45}
                textAnchor="end"
                interval={0}
                height={70}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#8A9AAA" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
                formatter={(value) => [
                  metric === "rating" ? Number(value).toFixed(1) : `${Math.round(Number(value))} min`,
                  metric === "rating" ? "Rating" : "Wait Time",
                ]}
              />
              <Bar dataKey={metric} fill={metric === "rating" ? "#3DBFAC" : "#f59e0b"} radius={[4, 4, 0, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          /* Horizontal bars when few resources */
          <ResponsiveContainer width="100%" height={Math.max(200, data.length * 32 + 40)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(210,195,165,0.3)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#8A9AAA" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tick={{ fontSize: 10, fill: "#4A5E6D" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
                formatter={(value) => [
                  metric === "rating" ? Number(value).toFixed(1) : `${Math.round(Number(value))} min`,
                  metric === "rating" ? "Rating" : "Wait Time",
                ]}
              />
              <Bar dataKey={metric} fill={metric === "rating" ? "#3DBFAC" : "#f59e0b"} radius={[0, 6, 6, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )
      ) : searched ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-[12px]" style={{ color: "#8A9AAA" }}>No resources found for this ZIP code</p>
        </div>
      ) : (
        <div className="flex items-center justify-center py-16">
          <p className="text-[12px]" style={{ color: "#8A9AAA" }}>Search a ZIP code to see results</p>
        </div>
      )}
    </div>
  );
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}
