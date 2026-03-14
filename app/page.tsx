"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import RoleGrid from "@/components/landing/RoleGrid";
import SearchBar from "@/components/landing/SearchBar";
import SuggestionChips from "@/components/landing/SuggestionChips";
import KpiSection from "@/components/landing/KpiSection";
import type { UserRole } from "@/types/chat";
import { getKpiStats, SUGGESTION_CHIPS } from "@/lib/mockData";

export default function LandingPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole>("community");
  const [searchQuery, setSearchQuery] = useState("");

  const kpiStats = getKpiStats(selectedRole);

  function handleSearch(query: string) {
    router.push(`/sandbox?q=${encodeURIComponent(query)}&role=${selectedRole}`);
  }

  function handleChipSelect(chip: string) {
    setSearchQuery(chip);
    handleSearch(chip);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <section className="bg-white border-b border-gray-100 px-6 py-16 text-center">
        <h1 className="mb-3 text-4xl font-bold tracking-tight text-gray-900">
          Welcome to{" "}
          <span className="text-lt-green-600">Lemon Tree</span>{" "}
          <span className="font-light">Insights</span>
        </h1>
        <p className="mx-auto max-w-xl text-base text-gray-500">
          Tell us a bit about yourself so we can surface the data that matters most to you.
        </p>
      </section>

      <div className="mx-auto max-w-4xl space-y-12 px-6 py-10">
        {/* Role selection */}
        <section className="space-y-4">
          <RoleGrid selectedRole={selectedRole} onSelectRole={setSelectedRole} />
          <p className="text-center text-xs text-gray-400">
            You can always change this later. This just helps us prioritize what you see first.
          </p>
        </section>

        {/* AI Search */}
        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Data that tells the{" "}
              <span className="text-lt-green-600">whole story</span>
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Explore Lemon Tree&apos;s food distribution data through guided insights. Ask questions
              in plain language — even ones the data wasn&apos;t originally built to answer.
            </p>
          </div>

          <SearchBar
            onSubmit={handleSearch}
            initialValue={searchQuery}
            placeholder="What are you trying to understand today?"
          />

          <SuggestionChips suggestions={SUGGESTION_CHIPS} onSelect={handleChipSelect} />
        </section>

        {/* KPI strip */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Insights for You</h2>
          <KpiSection stats={kpiStats} role={selectedRole} />
        </section>

        {/* Quick nav */}
        <section className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex-1 rounded-xl border border-lt-green-200 bg-lt-green-50 px-5 py-4 text-left transition hover:bg-lt-green-100"
          >
            <p className="font-semibold text-lt-green-800">📊 Explore the Dashboard</p>
            <p className="mt-1 text-xs text-lt-green-600">
              Browse charts, filter by region, and layer datasets
            </p>
          </button>
          <button
            onClick={() => router.push("/sandbox")}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-5 py-4 text-left transition hover:bg-gray-50"
          >
            <p className="font-semibold text-gray-800">🤖 Open AI Sandbox</p>
            <p className="mt-1 text-xs text-gray-500">
              Ask anything — query, explore, or investigate with AI
            </p>
          </button>
        </section>
      </div>
    </div>
  );
}
