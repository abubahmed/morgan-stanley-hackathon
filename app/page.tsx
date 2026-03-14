"use client";

import React, { useEffect, useState, useRef } from "react";
import { getResources } from '@/lib/lemontree_api';
import InteractiveMap, { FoodResource } from "./components/InteractiveMap";
import AttendanceChart from "./components/AttendanceChart";

export default function Home() {
  const [resources, setResources] = useState<FoodResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusedPantry, setFocusedPantry] = useState<FoodResource | null>(null);
  
  // Use a ref to track the cursor so we don't lose our place
  const cursorRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    async function fetchAllPages() {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        let hasMore = true;
        let firstBatch = true;

        while (hasMore) {
          // Fetch one page at a time (100 items per "drip")
          const response = await getResources({ 
            take: 100, 
            cursor: cursorRef.current || undefined 
          });

          const newItems = response.resources || [];
          
          // 🚀 Update the map immediately with the new items
          setResources(prev => [...prev, ...newItems]);

          // Hide the spinner as soon as the first 100 points land
          if (firstBatch) {
            setLoading(false);
            firstBatch = false;
          }

          // Check if there's another page
          if (response.cursor && response.cursor !== cursorRef.current) {
            cursorRef.current = response.cursor;
            // Optional: Add a tiny delay so the browser doesn't choke
            await new Promise(resolve => setTimeout(resolve, 100));
          } else {
            hasMore = false;
          }
        }
      } catch (err) {
        console.error("Streaming error:", err);
        setLoading(false);
      } finally {
        isFetchingRef.current = false;
      }
    }

    fetchAllPages();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 p-6 lg:p-10 text-zinc-900">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-6">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">National Live-Sync Dashboard</h1>
            <p className="text-zinc-500 text-sm">
              Status: {loading ? "Connecting..." : `Streaming Data (${resources.length} points synced)`}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[700px]">
          <div className="lg:col-span-8 rounded-3xl overflow-hidden border border-zinc-200 shadow-xl bg-white relative">
            <InteractiveMap 
              dataPoints={resources} 
              onViewTrends={(p) => setFocusedPantry(p)} 
            />
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className={`p-8 rounded-3xl border transition-all ${focusedPantry ? 'bg-zinc-900 text-white' : 'bg-white'}`}>
              <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Live Insights</h3>
              {focusedPantry ? (
                <div className="space-y-2">
                  <h2 className="text-lg font-bold">{focusedPantry.name}</h2>
                  <p className="text-sm opacity-80">{focusedPantry.addressStreet1}</p>
                  <p className="text-sm font-semibold text-blue-400">Wait Time: {focusedPantry.waitTimeMinutesAverage !== null && focusedPantry.waitTimeMinutesAverage !== undefined ? `${focusedPantry.waitTimeMinutesAverage} minutes` : 'Unknown'}</p>
                </div>
              ) : (
                <p className="text-sm text-zinc-400 italic">Select a point to view live wait metrics.</p>
              )}
            </div>
            {/* The chart still works based on focusedPantry */}
            <div className="bg-white p-6 rounded-3xl border border-zinc-200 flex-1">
              <AttendanceChart data={[]} /> 
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}