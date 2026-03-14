"use client";

import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/layout/Navbar";
import InteractiveMap, { FoodResource } from "@/components/map/InteractiveMap";
import AttendanceChart from "@/components/map/AttendanceChart";
import { MapPin, Activity, Loader2, AlertCircle } from "lucide-react";

const ATTENDANCE_DATA = [
  { year: "2019", attendance: 42000, demand: 58000 },
  { year: "2020", attendance: 71000, demand: 89000 },
  { year: "2021", attendance: 68000, demand: 82000 },
  { year: "2022", attendance: 61000, demand: 76000 },
  { year: "2023", attendance: 57000, demand: 72000 },
  { year: "2024", attendance: 53000, demand: 69000 },
];

export default function MapPage() {
  const [resources, setResources] = useState<FoodResource[]>([]);
  const [selectedResource, setSelectedResource] = useState<FoodResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadResources() {
      try {
        setLoading(true);
        const res = await fetch("/api/resources?take=200");
        if (!res.ok) throw new Error("Failed to load resources");
        const data = await res.json() as { resources: FoodResource[] };
        const valid = (data.resources ?? []).filter(
          (r) => r.latitude && r.longitude && r.latitude !== 0 && r.longitude !== 0
        );
        setResources(valid);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load map data");
      } finally {
        setLoading(false);
      }
    }
    loadResources();
  }, []);

  const handleViewTrends = useCallback((resource: FoodResource) => {
    setSelectedResource(resource);
  }, []);

  const waitColor = (wait: number | undefined) => {
    if (!wait) return "text-zinc-400";
    if (wait > 45) return "text-red-500";
    if (wait > 20) return "text-amber-500";
    return "text-emerald-500";
  };

  return (
    <div className="flex h-screen flex-col" style={{ backgroundColor: "#F5EDD8" }}>
      <Navbar />

      <div className="flex flex-1 overflow-hidden gap-4 p-4">
        {/* Map */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3"
            style={{ border: "1px solid rgba(210,195,165,0.45)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ background: "linear-gradient(135deg, #C8EDE8 0%, #A8DDD6 100%)" }}>
                <MapPin size={13} style={{ color: "#1E9080" }} />
              </div>
              <div>
                <p className="text-[14px] font-semibold" style={{ color: "#1E2D3D" }}>Live Resource Map</p>
                <p className="text-[11px]" style={{ color: "#8A9AAA" }}>
                  {loading ? "Loading..." : `${resources.length} locations`} · NYC Metro
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px]" style={{ color: "#8A9AAA" }}>
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500" /> &lt;20m wait</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-amber-500" /> 20-45m</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-red-500" /> &gt;45m</span>
            </div>
          </div>

          {/* Map container */}
          <div className="flex-1 relative rounded-2xl overflow-hidden">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 rounded-2xl">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={24} className="animate-spin" style={{ color: "#3DBFAC" }} />
                  <p className="text-[13px]" style={{ color: "#4A5E6D" }}>Loading resources...</p>
                </div>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10 rounded-2xl">
                <div className="flex flex-col items-center gap-2 text-center">
                  <AlertCircle size={24} className="text-red-400" />
                  <p className="text-[13px]" style={{ color: "#4A5E6D" }}>{error}</p>
                </div>
              </div>
            )}
            {!error && (
              <InteractiveMap dataPoints={resources} onViewTrends={handleViewTrends} />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 flex flex-col gap-3 overflow-y-auto">
          {/* Selected resource info */}
          <div className="bg-white rounded-2xl p-4"
            style={{ border: "1px solid rgba(210,195,165,0.45)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Activity size={13} style={{ color: "#3DBFAC" }} />
              <p className="text-[13px] font-semibold" style={{ color: "#1E2D3D" }}>
                {selectedResource ? "Selected Location" : "Location Details"}
              </p>
            </div>
            {selectedResource ? (
              <div className="space-y-2">
                <p className="text-[14px] font-semibold leading-tight" style={{ color: "#1E2D3D" }}>
                  {selectedResource.name}
                </p>
                {selectedResource.addressStreet1 && (
                  <p className="text-[12px]" style={{ color: "#8A9AAA" }}>{selectedResource.addressStreet1}</p>
                )}
                <div className="flex gap-2 mt-2">
                  <div className="flex-1 rounded-xl p-2 text-center"
                    style={{ background: "#F5EDD8", border: "1px solid rgba(210,195,165,0.4)" }}>
                    <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "#8A9AAA" }}>Wait</p>
                    <p className={`text-sm font-bold ${waitColor(selectedResource.waitTimeMinutesAverage)}`}>
                      {selectedResource.waitTimeMinutesAverage != null
                        ? `${selectedResource.waitTimeMinutesAverage}m`
                        : "—"}
                    </p>
                  </div>
                  <div className="flex-1 rounded-xl p-2 text-center"
                    style={{ background: "#F5EDD8", border: "1px solid rgba(210,195,165,0.4)" }}>
                    <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "#8A9AAA" }}>Zip</p>
                    <p className="text-sm font-bold" style={{ color: "#1E2D3D" }}>
                      {selectedResource.zipCode || "—"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[12px]" style={{ color: "#9AAAB8" }}>
                Click a marker on the map to see location details
              </p>
            )}
          </div>

          {/* Attendance trends */}
          <div className="bg-white rounded-2xl p-4 flex-1"
            style={{ border: "1px solid rgba(210,195,165,0.45)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
            <p className="text-[13px] font-semibold mb-1" style={{ color: "#1E2D3D" }}>Attendance vs Projected Need</p>
            <p className="text-[11px] mb-3" style={{ color: "#9AAAB8" }}>NYC metro food assistance, 2019–2024</p>
            <div className="h-48">
              <AttendanceChart data={ATTENDANCE_DATA} />
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-2xl p-4"
            style={{ border: "1px solid rgba(210,195,165,0.45)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
            <p className="text-[12px] font-semibold mb-3" style={{ color: "#1E2D3D" }}>Network Summary</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Total Sites", value: resources.length || "—" },
                { label: "Avg Wait", value: resources.length ? `${Math.round(resources.reduce((s, r) => s + (r.waitTimeMinutesAverage ?? 0), 0) / Math.max(resources.filter(r => r.waitTimeMinutesAverage != null).length, 1))}m` : "—" },
                { label: "Low Wait (<20m)", value: resources.filter(r => (r.waitTimeMinutesAverage ?? 99) < 20).length || "—" },
                { label: "High Wait (>45m)", value: resources.filter(r => (r.waitTimeMinutesAverage ?? 0) > 45).length || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl p-2.5 text-center"
                  style={{ background: "#F5EDD8", border: "1px solid rgba(210,195,165,0.4)" }}>
                  <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "#8A9AAA" }}>{label}</p>
                  <p className="text-base font-bold" style={{ color: "#1E2D3D" }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
