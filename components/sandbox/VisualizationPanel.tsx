import type { ChartSpec } from "@/types/chat";
import { BarChart3, X, TrendingUp } from "lucide-react";
import ChartRenderer from "./ChartRenderer";

interface VisualizationPanelProps {
  charts: ChartSpec[];
  isVisible: boolean;
  onToggle: () => void;
}

export default function VisualizationPanel({ charts, isVisible, onToggle }: VisualizationPanelProps) {
  return (
    <div
      className={`flex flex-col border-l transition-all duration-300 ${isVisible ? "w-[42%]" : "w-0 overflow-hidden"}`}
      style={{ borderColor: "rgba(210,195,165,0.5)", background: "linear-gradient(180deg, #F5EDD8 0%, #EEE2C4 100%)" }}
    >
      {isVisible && (
        <>
          <div
            className="flex items-center justify-between border-b bg-white/70 px-4 py-3 backdrop-blur-sm"
            style={{ borderColor: "rgba(210,195,165,0.4)" }}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg"
                style={{ background: "linear-gradient(135deg, #C8EDE8 0%, #A8DDD6 100%)" }}>
                <BarChart3 size={12} style={{ color: "#1E9080" }} />
              </div>
              <p className="text-[13px] font-semibold" style={{ color: "#1E2D3D" }}>Visualizations</p>
              {charts.length > 0 && (
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{ background: "linear-gradient(135deg, #3DBFAC 0%, #27A090 100%)", color: "white" }}
                >
                  {charts.length}
                </span>
              )}
            </div>
            <button
              onClick={onToggle}
              className="rounded-lg p-1 transition hover:bg-[#EDE2C4]"
            >
              <X size={14} style={{ color: "#8A9AAA" }} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {charts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div
                  className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(210,195,165,0.5)" }}
                >
                  <TrendingUp size={24} style={{ color: "#C8D8E0" }} />
                </div>
                <p className="text-[13px] font-semibold" style={{ color: "#6A7E8D" }}>Charts will appear here</p>
                <p className="mt-1 text-[11px]" style={{ color: "#9AAAB8" }}>Ask a question to generate visualizations</p>
              </div>
            ) : (
              charts.map((chart, i) => <ChartRenderer key={i} spec={chart} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}
