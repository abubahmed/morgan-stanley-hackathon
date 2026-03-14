"use client";

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

/**
 * Interface for the chart data.
 * This allows the AI to track "Attendance over time" (Years).
 */
interface AttendanceData {
  year: string;
  attendance: number;
  inflationIndex?: number; // Optional: To compare vs BLS data
}

interface ChartProps {
  data: AttendanceData[];
  title?: string;
}

export default function AttendanceChart({ data, title }: ChartProps) {
  return (
    <div className="w-full h-[400px] bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
      {title && <h2 className="text-lg font-semibold text-gray-800 mb-6">{title}</h2>}
      
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          {/* Subtle grid lines */}
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          
          <XAxis 
            dataKey="year" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#9ca3af', fontSize: 12 }} 
            dy={10}
          />
          
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#9ca3af', fontSize: 12 }} 
          />
          
          <Tooltip 
            contentStyle={{ 
              borderRadius: '8px', 
              border: 'none', 
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
            }} 
          />
          
          <Legend verticalAlign="top" align="right" iconType="circle" />

          {/* Main Attendance Line */}
          <Line
            type="monotone"
            dataKey="attendance"
            name="Pantry Attendance"
            stroke="#2563eb"
            strokeWidth={3}
            dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />

          {/* Inflation Comparison Line (Optional) */}
          {data[0]?.inflationIndex && (
            <Line
              type="monotone"
              dataKey="inflationIndex"
              name="Food Inflation (BLS)"
              stroke="#ef4444" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}