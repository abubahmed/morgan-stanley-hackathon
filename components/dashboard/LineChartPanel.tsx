import RechartsLineChart from "@/components/charts/RechartsLineChart";

interface LineChartPanelProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  title: string;
  subtitle?: string;
  color?: string;
}

export default function LineChartPanel({ data, xKey, yKey, title, subtitle, color }: LineChartPanelProps) {
  return (
    <div
      className="rounded-2xl bg-white p-5"
      style={{ border: "1px solid rgba(210,195,165,0.45)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
    >
      <div className="mb-1 flex items-start justify-between">
        <p className="text-[14px] font-semibold" style={{ color: "#1E2D3D" }}>{title}</p>
      </div>
      {subtitle && <p className="mb-4 text-xs" style={{ color: "#8A9AAA" }}>{subtitle}</p>}
      <RechartsLineChart data={data} xKey={xKey} yKey={yKey} color={color ?? "#3DBFAC"} />
    </div>
  );
}
