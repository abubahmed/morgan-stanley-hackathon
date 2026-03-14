import RechartsBarChart from "@/components/charts/RechartsBarChart";

interface BarChartPanelProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  title: string;
  subtitle?: string;
  color?: string;
}

export default function BarChartPanel({
  data,
  xKey,
  yKey,
  title,
  subtitle,
  color,
}: BarChartPanelProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      <div className="mt-3">
        <RechartsBarChart data={data} xKey={xKey} yKey={yKey} color={color} />
      </div>
    </div>
  );
}
