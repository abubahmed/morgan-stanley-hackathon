"use client";

import Link from "next/link";
import { Bot, ArrowRight } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import TotalResourcesByArea from "@/components/dashboard/TotalResourcesByArea";
import ResourcesByType from "@/components/dashboard/ResourcesByType";
import DashboardMap from "@/components/dashboard/DashboardMap";
import TrendsOverTime from "@/components/dashboard/TrendsOverTime";
import ResourcesByZip from "@/components/dashboard/ResourcesByZip";

export default function DashboardPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5EDD8" }}>
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 py-8">
        <DashboardHeader />

        <div
          className="mb-5 flex items-center justify-between rounded-2xl p-5"
          style={{
            background: "linear-gradient(135deg, #3DBFAC 0%, #1A8E80 100%)",
            boxShadow: "0 4px 20px rgba(61,191,172,0.25)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              <Bot size={20} color="white" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-white">Want deeper insights?</p>
              <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.75)" }}>
                Ask questions about the data using our AI-powered sandbox
              </p>
            </div>
          </div>
          <Link
            href="/sandbox"
            className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[13px] font-semibold transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]"
            style={{ color: "#1A8E80" }}
          >
            Open Sandbox
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <TotalResourcesByArea />
          <ResourcesByType />
        </div>

        <div className="mt-5">
          <DashboardMap />
        </div>

        <div className="mt-5">
          <TrendsOverTime />
        </div>

        <div className="mt-5">
          <ResourcesByZip />
        </div>
      </div>

      <Footer />
    </div>
  );
}
