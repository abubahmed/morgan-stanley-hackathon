"use client";

import { useRouter } from "next/navigation";

interface GuidedQuestion {
  question: string;
  description: string;
}

interface GuidedQuestionsProps {
  questions: GuidedQuestion[];
}

export default function GuidedQuestions({ questions }: GuidedQuestionsProps) {
  const router = useRouter();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-yellow-500">💡</span>
        <p className="text-sm font-semibold text-gray-800">Not sure where to start?</p>
      </div>
      <p className="mb-3 text-xs text-gray-500">
        These guided questions help you explore data even if you don&apos;t know exactly what
        you&apos;re looking for.
      </p>
      <div className="space-y-2">
        {questions.map(({ question, description }) => (
          <button
            key={question}
            onClick={() =>
              router.push(`/sandbox?q=${encodeURIComponent(question)}`)
            }
            className="w-full rounded-lg border border-gray-100 bg-gray-50 p-3 text-left transition hover:border-lt-green-200 hover:bg-lt-green-50"
          >
            <p className="text-xs font-medium text-gray-800">{question}</p>
            <p className="mt-0.5 text-xs text-gray-400">{description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
