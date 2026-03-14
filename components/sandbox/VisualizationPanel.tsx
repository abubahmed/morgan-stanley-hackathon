import type { ChartSpec } from "@/types/chat";
import ChartRenderer from "./ChartRenderer";

interface VisualizationPanelProps {
  charts: ChartSpec[];
  isVisible: boolean;
  onToggle: () => void;
}

export default function VisualizationPanel({
  charts,
  isVisible,
  onToggle,
}: VisualizationPanelProps) {
  return (
    <div
      className={`flex flex-col border-l border-gray-200 bg-gray-50 transition-all duration-300 ${
        isVisible ? "w-[42%]" : "w-0 overflow-hidden"
      }`}
    >
      {isVisible && (
        <>
          <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-base">📊</span>
              <p className="text-sm font-semibold text-gray-800">Visualizations</p>
              {charts.length > 0 && (
                <span className="rounded-full bg-lt-green-100 px-2 py-0.5 text-xs font-medium text-lt-green-700">
                  {charts.length}
                </span>
              )}
            </div>
            <button
              onClick={onToggle}
              className="text-xs text-gray-400 hover:text-gray-600 transition"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {charts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-12">
                <p className="text-3xl mb-2">📈</p>
                <p className="text-sm font-medium text-gray-500">Charts will appear here</p>
                <p className="text-xs mt-1">Ask a question to generate visualizations</p>
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
