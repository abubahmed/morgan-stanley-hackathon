"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import TotalResourcesByArea from "@/components/dashboard/TotalResourcesByArea";
import ResourcesByType from "@/components/dashboard/ResourcesByType";
import DashboardMap from "@/components/dashboard/DashboardMap";
import TrendsOverTime from "@/components/dashboard/TrendsOverTime";

export default function DashboardPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5EDD8" }}>
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 py-8">
        <DashboardHeader />

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
      </div>

      <Footer />
    </div>
  );
}
