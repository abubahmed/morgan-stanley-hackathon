"use client";

import React, { useEffect, useState } from "react";
import { getAllResources } from '@/lib/lemontree_api';
import InteractiveMap, { FoodResource } from "./components/InteractiveMap";
import AttendanceChart from "./components/AttendanceChart";

export default function Home() {
  const [resources, setResources] = useState<FoodResource[]>([]);
  
  // Placeholder for AI Insight
  const aiInsightPlaceholder = "AI INSIGHT PLACEHOLDER TEXT";

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getAllResources({ take: 30 });
        setResources(data);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 lg:p-12 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black tracking-tighter">RESOURCE INSIGHTS</h1>
            <p className="text-zinc-500 font-medium">NY-NJ Regional Food Security Dashboard</p>
          </div>
          <div className="flex gap-2">
            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Live Data
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Map Column */}
          <div className="lg:col-span-8 h-[600px] bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-xl dark:bg-zinc-900 dark:border-zinc-800">
            <InteractiveMap dataPoints={resources} />
          </div>

          {/* Data & Insights Column */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Trend Chart */}
            <div className="p-6 bg-white rounded-3xl border border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
              <h3 className="text-[10px] font-black uppercase text-zinc-400 mb-6 tracking-widest">Historical Demand</h3>
              <AttendanceChart data={[
                { year: '2023', attendance: 3100 },
                { year: '2024', attendance: 4200 },
                { year: '2025', attendance: 5800 }
              ]} />
            </div>

            {/* AI Insight Card */}
            <div className="p-8 bg-zinc-900 text-white rounded-3xl shadow-2xl flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">AI Overview</span>
                </div>
                <h3 className="text-xl font-bold mb-4">Regional Analysis</h3>
                <p className="text-sm leading-relaxed text-zinc-400 italic">
                  "{aiInsightPlaceholder}"
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-zinc-800">
                <button 
                  onClick={() => window.print()}
                  className="w-full bg-white text-black text-xs font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors uppercase tracking-widest"
                >
                  Export Insight PDF
                </button>
                <p className="text-[9px] text-zinc-600 mt-4 text-center uppercase font-medium">
                  Compiled via Census, BLS, and Lemontree API
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}