"use client";

import { useRouter } from "next/navigation";
import { Lightbulb, ArrowRight } from "lucide-react";

interface GuidedQuestion { question: string; description: string }
interface GuidedQuestionsProps { questions: GuidedQuestion[] }

export default function GuidedQuestions({ questions }: GuidedQuestionsProps) {
  const router = useRouter();
  return (
    <div
      className="rounded-2xl bg-white p-5"
      style={{ border: "1px solid rgba(210,195,165,0.45)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
    >
      <div className="mb-1 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: "linear-gradient(135deg, #FEF3E2 0%, #FDEBD0 100%)" }}>
          <Lightbulb size={13} style={{ color: "#D4861A" }} />
        </div>
        <p className="text-[14px] font-semibold" style={{ color: "#1E2D3D" }}>Not sure where to start?</p>
      </div>
      <p className="mb-4 text-xs leading-relaxed" style={{ color: "#8A9AAA" }}>
        These guided questions help you explore data even if you don&apos;t know exactly what you&apos;re looking for.
      </p>
      <div className="space-y-1.5">
        {questions.map(({ question, description }) => (
          <button
            key={question}
            onClick={() => router.push(`/sandbox?q=${encodeURIComponent(question)}`)}
            className="group w-full rounded-xl p-3 text-left transition-all hover:-translate-y-px hover:shadow-sm"
            style={{
              background: "linear-gradient(145deg, #F8F2E4 0%, #F2EAD4 100%)",
              border: "1px solid rgba(200,190,165,0.4)",
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[12px] font-semibold leading-snug" style={{ color: "#1E2D3D" }}>{question}</p>
                <p className="mt-0.5 text-[11px]" style={{ color: "#8A9AAA" }}>{description}</p>
              </div>
              <ArrowRight size={13} className="mt-0.5 shrink-0 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5"
                style={{ color: "#3DBFAC" }} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
