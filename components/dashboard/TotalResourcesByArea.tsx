"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface AreaData {
  area: string;
  resources: number;
}

export default function TotalResourcesByArea() {
  const [data, setData] = useState<AreaData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/resources-area")
      .then((r) => r.json())
      .then((result: AreaData[]) => setData(result))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="rounded-2xl bg-white p-5"
      style={{ border: "1px solid rgba(210,195,165,0.45)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <p className="mb-1 text-[14px] font-semibold" style={{ color: "#1E2D3D" }}>
        Total Resources by Area
      </p>
      <p className="mb-4 text-xs" style={{ color: "#8A9AAA" }}>
        {loading ? "Loading..." : "Active food resources by county"}
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <YAxis dataKey="area" type="category" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={90} />
          <XAxis type="number" domain={["dataMin - 20", "dataMax + 20"]} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
          <Bar dataKey="resources" fill="#3DBFAC" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
