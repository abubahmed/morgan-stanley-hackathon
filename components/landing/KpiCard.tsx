import type { KpiStat } from "@/types/chat";

export default function KpiCard({ label, value, delta, trend }: KpiStat) {
  const trendColor =
    trend === "up" ? "text-lt-green-600" : trend === "down" ? "text-red-500" : "text-gray-500";
  const trendIcon = trend === "up" ? "↗" : trend === "down" ? "↘" : "→";

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {delta && (
        <p className={`text-xs font-medium ${trendColor}`}>
          {trendIcon} {delta}
        </p>
      )}
    </div>
  );
}
