import type { ChartSpec } from "@/types/chat";
import RechartsBarChart from "@/components/charts/RechartsBarChart";
import RechartsLineChart from "@/components/charts/RechartsLineChart";
import RechartsPieChart from "@/components/charts/RechartsPieChart";

interface ChartRendererProps { spec: ChartSpec }

export default function ChartRenderer({ spec }: ChartRendererProps) {
  return (
    <div
      className="rounded-2xl bg-white p-4"
      style={{ border: "1px solid rgba(210,195,165,0.45)", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}
    >
      <p className="mb-3 text-[13px] font-semibold" style={{ color: "#1E2D3D" }}>{spec.title}</p>
      {spec.type === "bar" && (
        <RechartsBarChart data={spec.data} xKey={spec.xKey} yKey={spec.yKey}
          color={spec.color ?? "#3DBFAC"} height={200} />
      )}
      {spec.type === "line" && (
        <RechartsLineChart data={spec.data} xKey={spec.xKey} yKey={spec.yKey}
          color={spec.color ?? "#3DBFAC"} height={200} />
      )}
      {spec.type === "pie" && (
        <RechartsPieChart data={spec.data} nameKey={spec.xKey} valueKey={spec.yKey} height={200} />
      )}
    </div>
  );
}
