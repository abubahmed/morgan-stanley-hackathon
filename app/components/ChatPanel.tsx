"use client";

import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import type { ChatMessage, SandboxResult, IntentMode } from "@/types/chat";

// ─── Lightweight markdown renderer ──────────────────────────────────────────
// Handles: **bold**, *italic*, numbered lists, bullet lists, newlines.
// Avoids adding a full markdown library dependency.
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];

  lines.forEach((line, li) => {
    // Numbered list item
    const numMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      nodes.push(
        <div key={li} className="flex gap-1.5">
          <span className="shrink-0 font-semibold">{numMatch[1]}.</span>
          <span>{inlineMarkdown(numMatch[2])}</span>
        </div>
      );
      return;
    }
    // Bullet list item
    const bulletMatch = line.match(/^[-*]\s+(.*)/);
    if (bulletMatch) {
      nodes.push(
        <div key={li} className="flex gap-1.5">
          <span className="shrink-0">·</span>
          <span>{inlineMarkdown(bulletMatch[1])}</span>
        </div>
      );
      return;
    }
    // Blank line → spacer
    if (line.trim() === "") {
      nodes.push(<div key={li} className="h-1.5" />);
      return;
    }
    // Regular line
    nodes.push(<div key={li}>{inlineMarkdown(line)}</div>);
  });

  return <>{nodes}</>;
}

function inlineMarkdown(text: string): React.ReactNode {
  // Split on **bold** and *italic* tokens
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

// ─── Mode labels (mirrors lib/intentDetection.ts) ───────────────────────────
const MODE_LABELS: Record<IntentMode, string> = {
  1: "Specific Query",
  2: "Vague Exploration",
  3: "Causal Question",
  4: "Feedback",
};

const MODE_COLORS: Record<IntentMode, string> = {
  1: "from-teal-400 to-cyan-500",
  2: "from-violet-400 to-purple-500",
  3: "from-orange-400 to-amber-500",
  4: "from-green-400 to-emerald-500",
};

type AnalysisAPIResponse =
  | { type: "analysis"; mode: IntentMode; sandboxResult: SandboxResult }
  | { type: "analysis_error"; error: string }
  | { type: "conversation_error"; error: string };

// ─── Sub-components ──────────────────────────────────────────────────────────

function LoadingDots() {
  return (
    <div className="flex gap-1.5 items-center py-0.5" aria-label="Processing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-teal-400 animate-bounce"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </div>
  );
}

function AnalysisCard({
  result,
  mode,
}: {
  result: SandboxResult;
  mode: IntentMode;
}) {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm w-full">
      {/* Mode header */}
      <div
        className={`bg-gradient-to-r ${MODE_COLORS[mode]} px-4 py-2 flex items-center gap-2`}
      >
        <svg
          className="w-3.5 h-3.5 text-white/90 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <span className="text-white text-xs font-bold uppercase tracking-wide">
          {MODE_LABELS[mode]}
        </span>
        <span className="text-white/70 text-xs ml-auto">Analysis complete</span>
      </div>

      {/* Summary */}
      <div className="bg-white px-4 py-3">
        <p className="text-gray-800 text-sm leading-relaxed">{result.summary}</p>
      </div>

      {/* Chart slot — swap in your real visualization component here */}
      {result.chartData && (
        <div className="bg-gray-50 border-t border-gray-100 px-4 py-3">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
            {result.chartData.title}
          </p>
          {/* ↓ Replace this div with your chart component */}
          <div
            className="rounded-xl border-2 border-dashed border-gray-200 h-36 flex flex-col items-center justify-center gap-1 text-gray-400"
            data-chart-type={result.chartData.type}
            data-chart-title={result.chartData.title}
          >
            <svg
              className="w-6 h-6 opacity-40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16"
              />
            </svg>
            <span className="text-xs">
              {result.chartData.type} chart · visualization slot
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] bg-[#FFD93D] text-gray-900 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  // Loading placeholder
  if (message.isLoading) {
    return (
      <div className="flex justify-start items-end gap-2">
        <LemonAvatar />
        <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          <LoadingDots />
        </div>
      </div>
    );
  }

  // Error bubble
  if (message.error) {
    return (
      <div className="flex justify-start items-end gap-2">
        <LemonAvatar />
        <div className="max-w-[78%] bg-red-50 border border-red-200 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
          <p className="text-red-600 text-sm">
            <span className="font-medium">Error: </span>
            {message.error}
          </p>
        </div>
      </div>
    );
  }

  // Analysis result card
  if (message.isAnalysis && message.sandboxResult && message.mode) {
    return (
      <div className="flex justify-start items-start gap-2">
        <LemonAvatar />
        <div className="max-w-[85%] w-full">
          <AnalysisCard result={message.sandboxResult} mode={message.mode} />
        </div>
      </div>
    );
  }

  // Plain assistant message (streaming or complete)
  return (
    <div className="flex justify-start items-end gap-2">
      <LemonAvatar />
      <div className="max-w-[78%] bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-800 shadow-sm leading-relaxed">
        {message.isStreaming ? (
          <span className="whitespace-pre-wrap">
            {message.content
              .replace(/\*\*([^*]+)\*\*/g, "$1")
              .replace(/\*([^*]+)\*/g, "$1")
              .replace(/\*+/g, "")}
            <span className="inline-block w-[2px] h-[1em] bg-gray-600 ml-0.5 animate-pulse align-middle" />
          </span>
        ) : (
          renderMarkdown(message.content)
        )}
      </div>
    </div>
  );
}

function LemonAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-[#FFD93D] border-2 border-[#F5B800] flex items-center justify-center shrink-0 text-sm select-none shadow-sm">
      🍋
    </div>
  );
}

// ─── Main ChatPanel ──────────────────────────────────────────────────────────

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your Lemon Tree Insights assistant. Ask me about pantry visit trends, food access patterns, or anything about the network. Try asking \"show me visits last month\" to run a live analysis.",
    },
  ]);

  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isProcessing) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    const loadingId = crypto.randomUUID();
    const loadingMsg: ChatMessage = {
      id: loadingId,
      role: "assistant",
      content: "",
      isLoading: true,
    };

    // Snapshot history before adding the loading placeholder
    const historySnapshot = messages.filter((m) => !m.isLoading);

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setIsProcessing(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: historySnapshot }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }

      const contentType = res.headers.get("Content-Type") ?? "";

      if (contentType.includes("text/plain")) {
        // ── Streaming conversation response ──────────────────────────────────
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();

        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? { id: loadingId, role: "assistant" as const, content: "", isStreaming: true }
              : m
          )
        );

        let content = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          content += decoder.decode(value, { stream: true });
          const captured = content;
          setMessages((prev) =>
            prev.map((m) => (m.id === loadingId ? { ...m, content: captured } : m))
          );
        }

        setMessages((prev) =>
          prev.map((m) => (m.id === loadingId ? { ...m, isStreaming: false } : m))
        );
      } else {
        // ── JSON response (analysis) ──────────────────────────────────────────
        const data = (await res.json()) as AnalysisAPIResponse;
        let assistantMsg: ChatMessage;

        if (data.type === "analysis") {
          assistantMsg = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.sandboxResult.summary,
            isAnalysis: true,
            mode: data.mode,
            sandboxResult: data.sandboxResult,
          };
        } else {
          assistantMsg = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "",
            error: data.error ?? "Something went wrong. Please try again.",
          };
        }

        setMessages((prev) =>
          prev.map((m) => (m.id === loadingId ? assistantMsg : m))
        );
      }
    } catch (err) {
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        error:
          err instanceof Error
            ? err.message
            : "Connection failed. Please try again.",
      };
      setMessages((prev) =>
        prev.map((m) => (m.id === loadingId ? errMsg : m))
      );
    } finally {
      setIsProcessing(false);
      textareaRef.current?.focus();
    }
  }, [input, isProcessing, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      {/* ── Header ── */}
      <header className="bg-[#FFD93D] px-5 py-3 shadow-md shrink-0">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/60 flex items-center justify-center text-xl shadow-sm">
            🍋
          </div>
          <div>
            <h1 className="font-extrabold text-gray-900 text-base leading-tight tracking-tight">
              Lemon Tree Insights
            </h1>
            <p className="text-gray-700 text-xs font-medium">
              Food pantry network · data analysis
            </p>
          </div>
        </div>
      </header>

      {/* ── Message thread ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input bar ── */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 shrink-0">
        <div className="max-w-2xl mx-auto flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
            placeholder="Ask about pantry trends, visit patterns, food access…"
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent disabled:opacity-50 transition-shadow"
            style={{ minHeight: "42px", maxHeight: "120px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="bg-[#FFD93D] hover:bg-[#F5C800] active:bg-[#e8bc00] disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors shrink-0 shadow-sm"
          >
            {isProcessing ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-700 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-700 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-700 animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            ) : (
              "Send"
            )}
          </button>
        </div>
        <p className="text-center text-gray-400 text-xs mt-1.5">
          Enter to send &middot; Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
