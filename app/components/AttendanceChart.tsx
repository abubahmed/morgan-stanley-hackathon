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
 * Updated to include 'demand' to show the gap between supply and need.
 */
interface AttendanceData {
  year: string;
  attendance: number;
  demand?: number; 
  inflationIndex?: number;
}

interface ChartProps {
  data: AttendanceData[];
}

export default function AttendanceChart({ data }: ChartProps) {
  // If no data, show a simple loading state to prevent chart errors
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
        <p className="text-zinc-400 text-xs font-medium uppercase tracking-widest">Awaiting Data...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          {/* Subtle grid lines - horizontal only for a cleaner look */}
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
          
          <XAxis 
            dataKey="year" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 500 }} 
            dy={10}
          />
          
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 500 }} 
          />
          
          <Tooltip 
            cursor={{ stroke: '#e4e4e7', strokeWidth: 2 }}
            contentStyle={{ 
              borderRadius: '12px', 
              border: '1px solid #e4e4e7', 
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              fontSize: '12px',
              fontWeight: '600',
              padding: '8px 12px'
            }} 
          />
          
          <Legend 
            verticalAlign="top" 
            align="right" 
            iconType="circle" 
            wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          />

          {/* Main Attendance Line - The actual people served */}
          <Line
            type="monotone"
            dataKey="attendance"
            name="Actual Attendance"
            stroke="#2563eb"
            strokeWidth={3}
            dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6, strokeWidth: 0 }}
            animationDuration={1000}
          />

          {/* Projected Demand Line - Based on Census/BLS data */}
          <Line
            type="monotone"
            dataKey="demand"
            name="Projected Need"
            stroke="#94a3b8" 
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            animationDuration={1500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}