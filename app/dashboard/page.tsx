"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";

const barData = [
  { area: "Downtown", lbs: 12000 },
  { area: "Eastside", lbs: 8500 },
  { area: "Northgate", lbs: 15800 },
  { area: "Riverside", lbs: 5200 },
  { area: "Southpark", lbs: 11000 },
  { area: "Westend", lbs: 9300 },
];

const lineData = [
  { month: "Sep", families: 2900 },
  { month: "Oct", families: 3100 },
  { month: "Nov", families: 3800 },
  { month: "Dec", families: 4200 },
  { month: "Jan", families: 3600 },
  { month: "Feb", families: 3400 },
];

const datasets = [
  "Food Distribution Volume",
  "Partner Demand Requests",
  "Poverty Rates by Zip",
  "Community Demographics",
  "Food Waste Metrics",
  "Delivery Routes & Times",
];

const vizTypes = ["Bar Chart", "Map View", "Trend Line"];

const statCards = [
  {
    value: "64,300 lbs",
    badge: "+12%",
    badgeType: "positive",
    label: "Total Food Distributed",
    sub: "Across all partner sites this quarter vs last quarter",
    icon: <BoxIcon />,
  },
  {
    value: "28",
    badge: "2 new this month",
    badgeType: "neutral",
    label: "Active Distribution Sites",
    sub: "Partner locations receiving food",
    icon: <PinIcon />,
  },
  {
    value: "$0.23/lb",
    badge: "-5%",
    badgeType: "negative",
    label: "Delivery Efficiency",
    sub: "Average cost per pound delivered cost reduction",
    icon: <TruckIcon />,
  },
  {
    value: "12 sites",
    badge: "Needs attention",
    badgeType: "warning",
    label: "Unmet Demand",
    sub: "Sites reporting capacity constraints",
    icon: <WarnIcon />,
  },
];

export default function DashboardPage() {
  const [selectedDatasets, setSelectedDatasets] = useState(["Food Distribution Volume", "Partner Demand Requests"]);
  const [selectedViz, setSelectedViz] = useState("Bar Chart");

  const toggleDataset = (ds: string) => {
    setSelectedDatasets((prev) =>
      prev.includes(ds) ? prev.filter((d) => d !== ds) : [...prev, ds]
    );
  };

  return (
    <main style={{ backgroundColor: "#FAF7F0" }} className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#1a1a2e" }}>Platform Dashboard</h1>
          <p className="text-base max-w-lg" style={{ color: "#6b7280" }}>
            Explore real-time dashboards, combine datasets, and visualize insights that matter to your community
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4 mb-10">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl p-5 bg-white"
              style={{ border: "1px solid #e5e0d5" }}
            >
              <div className="flex items-start justify-between mb-3">
                <div style={{ color: "#3DBFA6" }}>{card.icon}</div>
                <Badge type={card.badgeType} label={card.badge} />
              </div>
              <p className="text-2xl font-bold mb-1" style={{ color: "#1a1a2e" }}>{card.value}</p>
              <p className="text-sm font-medium mb-1" style={{ color: "#1a1a2e" }}>{card.label}</p>
              <p className="text-xs" style={{ color: "#9ca3af" }}>{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-6 mb-10">
          {/* Bar Chart */}
          <div className="rounded-2xl p-6 bg-white" style={{ border: "1px solid #e5e0d5" }}>
            <p className="font-semibold text-base mb-1" style={{ color: "#1a1a2e" }}>Total Food Distributed by Area</p>
            <p className="text-xs mb-5" style={{ color: "#9ca3af" }}>Pounds distributed this quarter</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ece4" vertical={false} />
                <XAxis dataKey="area" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #e5e0d5", fontSize: 12 }}
                  formatter={(v: number) => [`${v.toLocaleString()} lbs`, "Distributed"]}
                />
                <Bar dataKey="lbs" fill="#3DBFA6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Area Chart */}
          <div className="rounded-2xl p-6 bg-white" style={{ border: "1px solid #e5e0d5" }}>
            <p className="font-semibold text-base mb-1" style={{ color: "#1a1a2e" }}>Families Served Over Time</p>
            <p className="text-xs mb-5" style={{ color: "#9ca3af" }}>Monthly trends — last 6 months</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={lineData}>
                <defs>
                  <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3DBFA6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3DBFA6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ece4" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #e5e0d5", fontSize: 12 }}
                  formatter={(v: number) => [`${v.toLocaleString()}`, "Families"]}
                />
                <Area type="monotone" dataKey="families" stroke="#3DBFA6" strokeWidth={2} fill="url(#tealGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cross-Dataset Exploration */}
        <div className="rounded-2xl p-6 bg-white" style={{ border: "1px solid #e5e0d5" }}>
          <div className="flex items-center gap-2 mb-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" fill="#F5A623"/>
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" stroke="#F5A623" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <h3 className="font-semibold text-base" style={{ color: "#1a1a2e" }}>Cross-Dataset Exploration</h3>
          </div>
          <p className="text-sm mb-6" style={{ color: "#6b7280" }}>
            Combine datasets to uncover hidden correlations and patterns affecting food access
          </p>

          <div className="mb-5">
            <p className="text-sm font-medium mb-3" style={{ color: "#1a1a2e" }}>Select Datasets to Combine</p>
            <div className="flex flex-wrap gap-2">
              {datasets.map((ds) => {
                const active = selectedDatasets.includes(ds);
                return (
                  <button
                    key={ds}
                    onClick={() => toggleDataset(ds)}
                    className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: active ? "#3DBFA6" : "#f5f0e8",
                      color: active ? "white" : "#4b5563",
                      border: active ? "1px solid #3DBFA6" : "1px solid #e5e0d5",
                    }}
                  >
                    {ds}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-3" style={{ color: "#1a1a2e" }}>Visualization Type</p>
            <div className="flex gap-3">
              {vizTypes.map((vt) => {
                const active = selectedViz === vt;
                return (
                  <button
                    key={vt}
                    onClick={() => setSelectedViz(vt)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: active ? "#3DBFA6" : "transparent",
                      color: active ? "white" : "#6b7280",
                      border: active ? "1px solid #3DBFA6" : "1px solid #e5e0d5",
                    }}
                  >
                    {vt === "Bar Chart" && <svg width="14" height="14" viewBox="0 0 16 16" fill={active ? "white" : "#9ca3af"}><rect x="1" y="8" width="3" height="7"/><rect x="6" y="4" width="3" height="11"/><rect x="11" y="1" width="3" height="14"/></svg>}
                    {vt === "Map View" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="10" r="3" stroke={active ? "white" : "#9ca3af"} strokeWidth="2"/><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke={active ? "white" : "#9ca3af"} strokeWidth="2"/></svg>}
                    {vt === "Trend Line" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke={active ? "white" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    {vt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ── Badge ──────────────────────────────────────────────── */

function Badge({ type, label }: { type: string; label: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    positive: { bg: "#ecfdf5", color: "#059669" },
    negative: { bg: "#fef2f2", color: "#dc2626" },
    neutral: { bg: "#eff6ff", color: "#2563eb" },
    warning: { bg: "#fff7ed", color: "#d97706" },
  };
  const s = styles[type] || styles.neutral;
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
      style={{ backgroundColor: s.bg, color: s.color }}>
      {type === "warning" && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke={s.color} strokeWidth="2"/>
          <line x1="12" y1="9" x2="12" y2="13" stroke={s.color} strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="17" r="1" fill={s.color}/>
        </svg>
      )}
      {label}
    </span>
  );
}

/* ── Icons ──────────────────────────────────────────────── */

function BoxIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="#3DBFA6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="#3DBFA6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="12" y1="22.08" x2="12" y2="12" stroke="#3DBFA6" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="#3DBFA6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="10" r="3" stroke="#3DBFA6" strokeWidth="2"/>
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="1" y="3" width="15" height="13" rx="1" stroke="#3DBFA6" strokeWidth="2"/>
      <path d="M16 8h4l3 3v5h-7V8z" stroke="#3DBFA6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="5.5" cy="18.5" r="2.5" stroke="#3DBFA6" strokeWidth="2"/>
      <circle cx="18.5" cy="18.5" r="2.5" stroke="#3DBFA6" strokeWidth="2"/>
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="12" y1="9" x2="12" y2="13" stroke="#d97706" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="17" r="1" fill="#d97706"/>
    </svg>
  );
}
