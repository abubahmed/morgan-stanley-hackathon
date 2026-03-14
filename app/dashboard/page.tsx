import Navbar from "@/components/layout/Navbar";
import BarChartPanel from "@/components/dashboard/BarChartPanel";
import LineChartPanel from "@/components/dashboard/LineChartPanel";
import GuidedQuestions from "@/components/dashboard/GuidedQuestions";
import CrossPollinationSandbox from "@/components/dashboard/CrossPollinationSandbox";
import {
  getFoodDistributionByArea,
  getFamiliesServedOverTime,
  GUIDED_QUESTIONS,
} from "@/lib/mockData";

export default function DashboardPage() {
  const barData = getFoodDistributionByArea();
  const lineData = getFamiliesServedOverTime();

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
              subtitle="Active food resources this quarter"
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
