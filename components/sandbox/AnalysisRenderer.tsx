import type { AnalysisResult } from "@/types/chat";
import { FlaskConical } from "lucide-react";

interface AnalysisRendererProps {
  result: AnalysisResult;
}

export default function AnalysisRenderer({ result }: AnalysisRendererProps) {
  const paragraphs = result.answer.split(/\n\n+/).filter((p) => p.trim());

  return (
    <div
      className="rounded-2xl bg-white p-5"
      style={{
        border: "1px solid rgba(210,195,165,0.45)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      }}
    >
      <div className="mb-4 flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: "linear-gradient(135deg, #DDF0EC 0%, #C8E8E2 100%)" }}
        >
          <FlaskConical size={14} style={{ color: "#3DBFAC" }} />
        </div>
        <p className="text-[13px] font-semibold" style={{ color: "#1E2D3D" }}>
          Analysis Results
        </p>
      </div>

      <div className="flex flex-col gap-3 text-[13px] leading-relaxed" style={{ color: "#3A5060" }}>
        {paragraphs.map((para, i) => (
          <p key={i}>
            {para.split("\n").map((line, j, arr) => (
              <span key={j}>
                {line}
                {j < arr.length - 1 && <br />}
              </span>
            ))}
          </p>
        ))}
      </div>

      {result.images.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          {result.images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt={`Analysis chart ${i + 1}`}
              className="w-full rounded-lg"
              style={{
                border: "1px solid rgba(210,195,165,0.3)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
