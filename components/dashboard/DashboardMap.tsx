"use client";

import { useEffect, useState } from "react";
import InteractiveMap from "@/components/map/InteractiveMap";
import type { FoodResource } from "@/components/map/InteractiveMap";

type MapMode = "none" | "transit" | "weather" | "foodInsecurity" | "income" | "snap";

interface MapData {
  points: FoodResource[];
  overlays: Record<string, Record<string, string>>;
}

export default function DashboardMap() {
  const [data, setData] = useState<MapData | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>("income");

  useEffect(() => {
    fetch("/api/map-data")
      .then((r) => r.json())
      .then((result: MapData) => setData(result))
      .catch(() => {});
  }, []);

  const toggle = (mode: MapMode) => setMapMode((prev) => (prev === mode ? "none" : mode));

  const overlayColors: string[] = [];
  if (data && mapMode !== "none" && mapMode !== "weather") {
    const colorMap = data.overlays[mapMode];
    if (colorMap) {
      for (const [fips, color] of Object.entries(colorMap)) {
        overlayColors.push(fips, color);
      }
    }
  }

  // InteractiveMap expects specific mode values for fill-opacity logic
  const interactiveMode = mapMode === "none" || mapMode === "weather" ? mapMode : "poverty";

  return (
    <div
      className="rounded-2xl bg-white p-5"
      style={{ border: "1px solid rgba(210,195,165,0.45)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <p className="mb-1 text-[14px] font-semibold" style={{ color: "#1E2D3D" }}>
            Resource Map
          </p>
          <p className="text-xs" style={{ color: "#8A9AAA" }}>
            {data ? `${data.points.length.toLocaleString()} resources nationwide` : "Loading..."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <OverlayBtn label="Weather" active={mapMode === "weather"} onClick={() => toggle("weather")} color="#3b82f6" />
          <OverlayBtn label="Transit" active={mapMode === "transit"} onClick={() => toggle("transit")} color="#10b981" />
          <OverlayBtn label="Food Insecurity" active={mapMode === "foodInsecurity"} onClick={() => toggle("foodInsecurity")} color="#ef4444" />
          <OverlayBtn label="Income" active={mapMode === "income"} onClick={() => toggle("income")} color="#8b5cf6" />
          <OverlayBtn label="SNAP" active={mapMode === "snap"} onClick={() => toggle("snap")} color="#ec4899" />
        </div>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ height: 450 }}>
        <InteractiveMap
          dataPoints={data?.points ?? []}
          mode={interactiveMode}
          overlayColors={overlayColors.length > 0 ? overlayColors : undefined}
        />
      </div>
    </div>
  );
}

function OverlayBtn({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all duration-150"
      style={{
        backgroundColor: active ? color : "transparent",
        color: active ? "#fff" : "#6b7280",
        border: `1.5px solid ${active ? color : "#e5e7eb"}`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: active ? "#fff" : color }} />
      {label}
    </button>
  );
}
