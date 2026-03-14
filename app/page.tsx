"use client";

import React, { useState } from "react";
import Image from "next/image";
import InteractiveMap, { FoodResource } from "./components/InteractiveMap";
import AttendanceChart from "./components/AttendanceChart";

// 1. Mock Data for the Hackathon (Replace with real API calls later)
const MOCK_RESOURCES: FoodResource[] = [
  {
    id: "1",
    name: "Lemontree Brooklyn Hub",
    latitude: 40.6782,
    longitude: -73.9442,
    addressStreet1: "123 Atlantic Ave",
    waitTimeMinutesAverage: 15,
    ratingAverage: 4.5,
    zipCode: "11201"
  },
  {
    id: "2",
    name: "Manhattan Central Pantry",
    latitude: 40.7831,
    longitude: -73.9712,
    addressStreet1: "456 Columbus Ave",
    waitTimeMinutesAverage: 45,
    ratingAverage: 3.8,
    zipCode: "10024"
  }
];

const MOCK_TRENDS = [
  { year: "2021", attendance: 4200, inflationIndex: 280 },
  { year: "2022", attendance: 5100, inflationIndex: 305 },
  { year: "2023", attendance: 5800, inflationIndex: 318 },
  { year: "2024", attendance: 7200, inflationIndex: 326 },
  { year: "2025", attendance: 8100, inflationIndex: 340 },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      {/* Top Navigation Bar */}
      <nav className="flex items-center justify-between border-b bg-white px-8 py-4 dark:border-zinc-800 dark:bg-black">
        <div className="flex items-center gap-4">
          <Image
            className="dark:invert"
            src="/next.svg"
            alt="Next.js logo"
            width={80}
            height={16}
            priority
          />
          <span className="text-zinc-300 dark:text-zinc-700">|</span>
          <h2 className="text-sm font-medium tracking-tight text-zinc-600 dark:text-zinc-400">
            Food Security Monitor 2026
          </h2>
        </div>
        <div className="flex gap-4">
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Live API Status: Active
          </span>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl p-8">
        <header className="mb-10 text-center sm:text-left">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Regional Demand & Inflation
          </h1>
          <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
            Analyzing correlations between Lemontree attendance, Census poverty, and BLS inflation.
          </p>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* Left Side: The Map (takes up 7/12 columns) */}
          <div className="lg:col-span-7">
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Geospatial Distribution
              </h3>
              <InteractiveMap dataPoints={MOCK_RESOURCES} />
            </div>
          </div>

          {/* Right Side: The Data Viz (takes up 5/12 columns) */}
          <div className="flex flex-col gap-8 lg:col-span-5">
            
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                National Trends
              </h3>
              <AttendanceChart 
                data={MOCK_TRENDS} 
                title="Historical Attendance vs. Food Inflation" 
              />
            </div>

            {/* Insight Card - Good for AI Summaries */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-black">
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">AI Rapid Insight</h4>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Pantry attendance in <strong>11201</strong> has increased by <strong>22%</strong> year-over-year, 
                outpacing local wage growth reported by the BLS. This indicates a growing "Grocery Gap" in this sector.
              </p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}