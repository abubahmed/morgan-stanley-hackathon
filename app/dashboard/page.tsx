"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import BarChartPanel from "@/components/dashboard/BarChartPanel";
import LineChartPanel from "@/components/dashboard/LineChartPanel";
import GuidedQuestions from "@/components/dashboard/GuidedQuestions";
import CrossPollinationSandbox from "@/components/dashboard/CrossPollinationSandbox";
import { getFamiliesServedOverTime, GUIDED_QUESTIONS } from "@/lib/mockData";

const NYC_REGIONS = [
  { area: "Bronx", zip: "10451" },
  { area: "Brooklyn", zip: "11201" },
  { area: "Manhattan", zip: "10001" },
  { area: "Queens", zip: "11101" },
  { area: "Staten Island", zip: "10301" },
  { area: "Newark", zip: "07102" },
  { area: "Jersey City", zip: "07302" },
  { area: "Yonkers", zip: "10701" },
];

const FALLBACK_BAR_DATA = [
  { area: "Bronx", resources: 312 },
  { area: "Brooklyn", resources: 428 },
  { area: "Manhattan", resources: 267 },
  { area: "Queens", resources: 341 },
  { area: "Staten Island", resources: 89 },
  { area: "Newark", resources: 156 },
  { area: "Jersey City", resources: 112 },
  { area: "Yonkers", resources: 74 },
];

export default function DashboardPage() {
  const lineData = getFamiliesServedOverTime();
  const [barData, setBarData] = useState(FALLBACK_BAR_DATA);
  const [loadingBar, setLoadingBar] = useState(true);

  useEffect(() => {
    async function loadRegionCounts() {
      try {
        const results = await Promise.all(
          NYC_REGIONS.map(async ({ area, zip }) => {
            const res = await fetch(`/api/resources?zip=${zip}&take=1`);
            if (!res.ok) return { area, resources: 0 };
            const data = await res.json() as { count?: number };
            return { area, resources: data.count ?? 0 };
          })
        );
        // Only replace if we got meaningful data
        const total = results.reduce((s, r) => s + r.resources, 0);
        if (total > 0) setBarData(results);
      } catch {
        // keep fallback
      } finally {
        setLoadingBar(false);
      }
    }
    loadRegionCounts();
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5EDD8" }}>
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "#1E2D3D" }}>Explore the Data</h1>
          <p className="mt-1 text-sm" style={{ color: "#4A5E6D" }}>
            Browse food access trends, filter by region, and layer datasets
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Left: charts */}
          <div className="space-y-5 lg:col-span-2">
            <BarChartPanel
              data={barData}
              xKey="area"
              yKey="resources"
              title="Total Resources by Area"
              subtitle={loadingBar ? "Loading real data..." : "Active food resources by region"}
            />
            <LineChartPanel
              data={lineData}
              xKey="month"
              yKey="families"
              title="Families Served Over Time"
              subtitle="Monthly trend — last 6 months"
              color="#3DBFAC"
            />
          </div>

          {/* Right: cross-pollination + guided questions */}
          <div className="space-y-5">
            <CrossPollinationSandbox />
            <GuidedQuestions questions={GUIDED_QUESTIONS} />
          </div>
        </div>
      </div>
    </div>
  );
}
