import { BarChart3, MapPin, TrendingUp } from "lucide-react";

const STATS = [
  { icon: MapPin, value: "14,000+", label: "Resources tracked" },
  { icon: BarChart3, value: "3,100+", label: "Counties covered" },
  { icon: TrendingUp, value: "9 Years", label: "Trend data" },
];

export default function DashboardHeader() {
  return (
    <div className="mb-6 pt-2">
      <p className="text-xl font-extrabold" style={{ color: "black" }}>
        Quick View Dashboard
      </p>

      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="mt-2 text-base leading-relaxed max-w-xl" style={{ color: "#6A7E8D" }}>
            Real-time resource distribution, demographic overlays, and trend analysis nationwide, statewide, and countywide.
          </p>
        </div>

        <div className="flex gap-5 mb-1">
          {STATS.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ backgroundColor: "rgba(61,191,172,0.1)" }}
              >
                <Icon size={16} style={{ color: "#3DBFAC" }} />
              </div>
              <div>
                <p className="text-[15px] font-bold leading-none" style={{ color: "#1E2D3D" }}>{value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "#8A9AAA" }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
