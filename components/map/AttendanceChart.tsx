"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface AttendanceData {
  year: string;
  attendance: number;
  demand?: number;
}

interface ChartProps {
  data: AttendanceData[];
}

export default function AttendanceChart({ data }: ChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
        <p className="text-zinc-400 text-xs font-medium uppercase tracking-widest">Awaiting Data...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
          <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: "#a1a1aa", fontSize: 11 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
          <Tooltip
            cursor={{ stroke: "#e4e4e7", strokeWidth: 2 }}
            contentStyle={{ borderRadius: "12px", border: "1px solid #e4e4e7", fontSize: "12px", padding: "8px 12px" }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: "16px", fontSize: "10px", fontWeight: "700", textTransform: "uppercase" }}
          />
          <Line
            type="monotone"
            dataKey="attendance"
            name="Actual Attendance"
            stroke="#3DBFAC"
            strokeWidth={3}
            dot={{ r: 4, fill: "#3DBFAC", strokeWidth: 2, stroke: "#fff" }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="demand"
            name="Projected Need"
            stroke="#94a3b8"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
