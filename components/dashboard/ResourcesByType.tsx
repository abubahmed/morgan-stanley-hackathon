"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface TypeData {
  type: string;
  resources: number;
}

const COLORS: Record<string, string> = {
  "Food Pantry": "#3DBFAC",
  "Soup Kitchen": "#8b5cf6",
  "SNAP/EBT": "#f59e0b",
  "Community Fridge": "#ec4899",
  "Meal Delivery": "#3b82f6",
  "Public Benefits": "#6366f1",
  "Grocery Delivery": "#14b8a6",
  "Other": "#9ca3af",
  "Material Needs": "#f97316",
  "Financial Aid": "#84cc16",
};

export default function ResourcesByType() {
  const [data, setData] = useState<TypeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/resources-type")
      .then((r) => r.json())
      .then((result: TypeData[]) => setData(result))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const total = data.reduce((s, d) => s + d.resources, 0);

  return (
    <div
      className="rounded-2xl bg-white p-5"
      style={{ border: "1px solid rgba(210,195,165,0.45)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <p className="mb-1 text-[14px] font-semibold" style={{ color: "#1E2D3D" }}>
        Resources by Type
      </p>
      <p className="mb-4 text-xs" style={{ color: "#8A9AAA" }}>
        {loading ? "Loading..." : "Breakdown by resource category"}
      </p>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width="60%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="resources"
              nameKey="type"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              strokeWidth={2}
              stroke="#fff"
            >
              {data.map((d) => (
                <Cell key={d.type} fill={COLORS[d.type] ?? "#a1a1aa"} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              formatter={(value) => [Number(value).toLocaleString(), "Resources"]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-3">
          {data.map((d) => (
            <div key={d.type} className="flex items-center gap-2.5">
              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[d.type] ?? "#a1a1aa" }} />
              <div>
                <p className="text-[12px] font-semibold" style={{ color: "#1E2D3D" }}>{d.type}</p>
                <p className="text-[11px]" style={{ color: "#8A9AAA" }}>
                  {d.resources.toLocaleString()} ({total > 0 ? Math.round((d.resources / total) * 100) : 0}%)
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
