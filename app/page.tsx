"use client";

import React, { useEffect, useState, useRef } from "react";
import { getResources } from '@/lib/lemontree_api';
import InteractiveMap, { FoodResource } from "./components/InteractiveMap";

export default function Home() {
  const [resources, setResources] = useState<FoodResource[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Swapped 'usda' for 'poverty'
  const [mapMode, setMapMode] = useState<'none' | 'transit' | 'weather' | 'employment' | 'poverty'>('none');
  
  const cursorRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

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
        setLoading(false); 
      } finally { 
        isFetchingRef.current = false; 
      }
    }
    fetchAllPages();
  }, [loading]);

  const handleModeToggle = (mode: 'transit' | 'weather' | 'employment' | 'poverty') => {
    setMapMode(prevMode => prevMode === mode ? 'none' : mode);
  };

  return (
    <main className="min-h-screen bg-zinc-50 p-6 lg:p-10 text-zinc-900 font-sans">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-6">
        <header>
          <h1 className="text-3xl font-black tracking-tighter uppercase text-zinc-800">National Live-Sync Dashboard</h1>
          <p className="text-zinc-500 text-sm font-medium">
            {loading ? "Connecting to Lemontree API..." : `Streaming: ${resources.length} points synced`}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[750px]">
          {/* MAP BOX */}
          <div className="lg:col-span-8 rounded-3xl overflow-hidden border border-zinc-200 shadow-xl bg-white relative">
            <InteractiveMap dataPoints={resources} mode={mapMode} />
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="p-8 rounded-3xl border border-zinc-200 bg-white shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6">Infrastructure Analysis</h3>
              
              <div className="grid grid-cols-1 gap-3">
                <OverlayButton 
                  label="Weather Data" 
                  active={mapMode === 'weather'} 
                  onClick={() => handleModeToggle('weather')} 
                  colorScheme="blue" 
                />
                <OverlayButton 
                  label="Transit Data" 
                  active={mapMode === 'transit'} 
                  onClick={() => handleModeToggle('transit')} 
                  colorScheme="emerald" 
                />
                <OverlayButton 
                  label="Employment Data" 
                  active={mapMode === 'employment'} 
                  onClick={() => handleModeToggle('employment')} 
                  colorScheme="red" 
                />
                {/* REPLACED USDA WITH POVERTY */}
                <OverlayButton 
                  label="Poverty Data (Census)" 
                  active={mapMode === 'poverty'} 
                  onClick={() => handleModeToggle('poverty')} 
                  colorScheme="amber" 
                />
              </div>
            </div>

            {/* BOTTOM RIGHT BOX - EMPTY */}
            <div className="bg-zinc-100/50 rounded-3xl border border-dashed border-zinc-200 flex-1 opacity-50" />
          </div>
        </div>
      </div>
    </main>
  );
}

function OverlayButton({ label, active, onClick, colorScheme }: { label: string, active: boolean, onClick: () => void, colorScheme: string }) {
  const schemes: any = {
    emerald: active ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-900/20' : 'text-zinc-400 border-zinc-100 hover:border-emerald-200',
    blue: active ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-900/20' : 'text-zinc-400 border-zinc-100 hover:border-blue-200',
    red: active ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-900/20' : 'text-zinc-400 border-zinc-100 hover:border-red-200',
    amber: active ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-900/20' : 'text-zinc-400 border-zinc-100 hover:border-amber-200',
  };

  return (
    <button 
      onClick={onClick} 
      className={`w-full py-4 px-6 rounded-2xl border text-[11px] font-black uppercase tracking-tight transition-all duration-200 ${schemes[colorScheme]}`}
    >
      {label}
    </button>
  );
}