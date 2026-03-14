import RechartsLineChart from "@/components/charts/RechartsLineChart";

interface LineChartPanelProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  title: string;
  subtitle?: string;
  color?: string;
}

export default function LineChartPanel({
  data,
  xKey,
  yKey,
  title,
  subtitle,
  color,
}: LineChartPanelProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      <div className="mt-3">
        <RechartsLineChart data={data} xKey={xKey} yKey={yKey} color={color} />
      </div>
    </div>
  );
}
