"use client";

import React, { useEffect, useState, useRef } from "react";
import Navbar from "@/components/layout/Navbar";
import InteractiveMap, { FoodResource } from "@/components/map/InteractiveMap";
import AttendanceChart from "@/components/map/AttendanceChart";
import { getResources } from '@/lib/lemontree_api';

export default function MapPage() {
  const [resources, setResources] = useState<FoodResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapMode, setMapMode] = useState<'none' | 'transit' | 'weather' | 'employment' | 'poverty'>('none');
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  
  const cursorRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  // --- 1. National Resource Streaming ---
  useEffect(() => {
    async function fetchAllPages() {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        let hasMore = true;
        while (hasMore) {
          const response = await getResources({ take: 100, cursor: cursorRef.current || undefined });
          const newItems = response.resources || [];
          
          setResources((prev: FoodResource[]) => {
            const existingIds = new Set(prev.map((p: FoodResource) => p.id));
            const uniqueNew = newItems.filter((p: FoodResource) => !existingIds.has(p.id));
            return [...prev, ...uniqueNew];
          });

          if (loading) setLoading(false);
          
          if (response.cursor && response.cursor !== cursorRef.current) {
            cursorRef.current = response.cursor;
            await new Promise(resolve => setTimeout(resolve, 50));
          } else { 
            hasMore = false; 
          }
        }
      } catch (err) { 
        console.error("Sync error:", err);
        setLoading(false); 
      } finally { 
        isFetchingRef.current = false; 
      }
    }
    fetchAllPages();
  }, []);

  // --- 2. NYC Food Insecurity Trend Aggregation ---
  useEffect(() => {
    async function loadNYCData() {
      try {
        const res = await fetch('/csv/nyc_food_insecurity.csv');
        if (!res.ok) throw new Error("NYC CSV not found");
        
        const text = await res.text();
        const lines = text.split('\n').filter(l => l.trim() !== '');
        
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const yearIdx = headers.indexOf('year');
        const insecureIdx = headers.indexOf('food_insecure_pct');
        const scoreIdx = headers.indexOf('weighted_score');

        const yearAggregator = new Map<string, { count: number, totalInsecure: number, totalScore: number }>();

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim());
          const year = cols[yearIdx];
          const insecurePct = parseFloat(cols[insecureIdx]) || 0;
          const weightedScore = parseFloat(cols[scoreIdx]) || 0;

          if (year && !isNaN(insecurePct)) {
            const current = yearAggregator.get(year) || { count: 0, totalInsecure: 0, totalScore: 0 };
            yearAggregator.set(year, {
              count: current.count + 1,
              totalInsecure: current.totalInsecure + insecurePct,
              totalScore: current.totalScore + weightedScore
            });
          }
        }

        const finalData = Array.from(yearAggregator.entries())
          .map(([year, stats]) => ({
            year,
            demand: Math.round((stats.totalInsecure / stats.count) * 1000), 
            attendance: Math.round((stats.totalScore / stats.count) * 10)
          }))
          .sort((a, b) => a.year.localeCompare(b.year));

        setAttendanceData(finalData);
      } catch (e) {
        console.error("NYC Aggregation Error:", e);
      }
    }
    loadNYCData();
  }, []);

  const handleModeToggle = (mode: 'transit' | 'weather' | 'employment' | 'poverty') => {
    setMapMode(prevMode => prevMode === mode ? 'none' : mode);
  };

  return (
    <div className="flex h-screen flex-col bg-[#F5EDD8]">
      <Navbar />
      
      <main className="flex-1 overflow-hidden p-4 lg:p-6 text-zinc-900 font-sans">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-4 h-full">
          <header className="flex flex-wrap justify-between items-end gap-2 shrink-0">
            <div>
              <h1 className="text-xl lg:text-2xl font-black tracking-tighter uppercase text-zinc-800 leading-none">National Live-Sync</h1>
              <p className="text-zinc-500 text-[10px] lg:text-xs font-medium mt-1">
                {loading ? "Establishing stream..." : `Streaming: ${resources.length.toLocaleString()} points synced`}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3 mb-1">
               <LegendItem color="bg-emerald-500" label="Optimal" />
               <LegendItem color="bg-amber-500" label="Strained" />
               <LegendItem color="bg-red-500" label="Critical" />
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
            {/* MAP SECTION */}
            <div className="lg:col-span-8 xl:col-span-9 rounded-3xl overflow-hidden border border-[#D2C3A5]/40 shadow-xl bg-white relative">
              <InteractiveMap dataPoints={resources} mode={mapMode} />
            </div>

            {/* SIDEBAR SECTION */}
            <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4 overflow-hidden">
              <div className="p-5 rounded-3xl border border-[#D2C3A5]/40 bg-white shadow-sm shrink-0">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">Infrastructure Analysis</h3>
                <div className="grid grid-cols-1 gap-2">
                  <OverlayButton label="Weather Radar" active={mapMode === 'weather'} onClick={() => handleModeToggle('weather')} colorScheme="blue" />
                  <OverlayButton label="Transit Density" active={mapMode === 'transit'} onClick={() => handleModeToggle('transit')} colorScheme="emerald" />
                  <OverlayButton label="Employment Data" active={mapMode === 'employment'} onClick={() => handleModeToggle('employment')} colorScheme="red" />
                  <OverlayButton label="Poverty (Census)" active={mapMode === 'poverty'} onClick={() => handleModeToggle('poverty')} colorScheme="amber" />
                </div>
              </div>

              {/* NYC TREND CHART - Fixed with overflow handling */}
              <div className="p-5 rounded-3xl border border-[#D2C3A5]/40 bg-white shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 shrink-0">NYC Impact Trends</h4>
                <div className="flex-1 min-h-0">
                  <AttendanceChart data={attendanceData} />
                </div>
                <div className="mt-3 pt-3 border-t border-zinc-50 shrink-0">
                  <p className="text-[10px] text-zinc-400 leading-relaxed italic break-words">
                    *Historical sync analyzing food insecurity vs. weighted vulnerability scores (2022-2025).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function LegendItem({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">{label}</span>
    </div>
  );
}

function OverlayButton({ label, active, onClick, colorScheme }: { label: string, active: boolean, onClick: () => void, colorScheme: string }) {
  const schemes: any = {
    emerald: active ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'text-zinc-400 border-zinc-100 bg-zinc-50/50 hover:border-emerald-200',
    blue: active ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'text-zinc-400 border-zinc-100 bg-zinc-50/50 hover:border-blue-200',
    red: active ? 'bg-red-600 text-white border-red-600 shadow-md' : 'text-zinc-400 border-zinc-100 bg-zinc-50/50 hover:border-red-200',
    amber: active ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'text-zinc-400 border-zinc-100 bg-zinc-50/50 hover:border-amber-200',
  };

  return (
    <button onClick={onClick} className={`w-full py-2.5 px-4 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all duration-200 ${schemes[colorScheme]}`}>
      {label}
    </button>
  );
}