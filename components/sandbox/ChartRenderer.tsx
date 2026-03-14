import type { ChartSpec } from "@/types/chat";
import RechartsBarChart from "@/components/charts/RechartsBarChart";
import RechartsLineChart from "@/components/charts/RechartsLineChart";
import RechartsPieChart from "@/components/charts/RechartsPieChart";

interface ChartRendererProps {
  spec: ChartSpec;
}

export default function ChartRenderer({ spec }: ChartRendererProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-gray-800">{spec.title}</p>
      {spec.type === "bar" && (
        <RechartsBarChart
          data={spec.data}
          xKey={spec.xKey}
          yKey={spec.yKey}
          color={spec.color ?? "#16a34a"}
          height={220}
        />
      )}
      {spec.type === "line" && (
        <RechartsLineChart
          data={spec.data}
          xKey={spec.xKey}
          yKey={spec.yKey}
          color={spec.color ?? "#22c55e"}
          height={220}
        />
      )}
      {spec.type === "pie" && (
        <RechartsPieChart
          data={spec.data}
          nameKey={spec.xKey}
          valueKey={spec.yKey}
          height={220}
        />
      )}
    </div>
  );
}
