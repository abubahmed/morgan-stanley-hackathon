"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#16a34a", "#22c55e", "#86efac", "#4ade80", "#bbf7d0"];

interface RechartsPieChartProps {
  data: Record<string, unknown>[];
  nameKey: string;
  valueKey: string;
  height?: number;
}

export default function RechartsPieChart({
  data,
  nameKey,
  valueKey,
  height = 240,
}: RechartsPieChartProps) {
  return (
    <div className="w-full min-w-0">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={40}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              fontSize: "12px",
            }}
          />
          <Legend iconType="circle" iconSize={8} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
