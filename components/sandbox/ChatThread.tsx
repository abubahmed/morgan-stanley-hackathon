"use client";

import { useEffect, useRef } from "react";
import { Leaf } from "lucide-react";
import type { ChatMessage } from "@/types/chat";
import ChatMessageBubble from "./ChatMessage";

interface ThinkingStatus {
  status?: string;
  reasoning?: string;
  code?: string;
}

interface ChatThreadProps {
  messages: ChatMessage[];
  isLoading: boolean;
  thinkingStatus?: ThinkingStatus | null;
  onOpenReport?: (index: number) => void;
  onDownloadReport?: (index: number) => void;
}

export default function ChatThread({ messages, isLoading, thinkingStatus, onOpenReport, onDownloadReport }: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinkingStatus]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            background: "linear-gradient(135deg, #C8EDE8 0%, #A8DDD6 100%)",
            boxShadow: "0 4px 16px rgba(61,191,172,0.2)",
          }}
        >
          <Leaf size={26} style={{ color: "#1E9080" }} />
        </div>
        <p className="text-[14px] font-semibold" style={{ color: "#1E2D3D" }}>
          Ask anything about food access data
        </p>
        <p className="mt-2 max-w-xs text-[12px] leading-relaxed" style={{ color: "#8A9AAA" }}>
          Try: &ldquo;Show me resources in zip code 10001&rdquo; or &ldquo;Why do some pantries have lower ratings?&rdquo;
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-white px-4 py-4">
      {messages.map((msg) => (
        <ChatMessageBubble key={msg.id} message={msg} onOpenReport={onOpenReport} onDownloadReport={onDownloadReport} />
      ))}
      {isLoading && thinkingStatus && (
        <div className="flex justify-start">
          <div
            className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3"
            style={{
              background: "rgba(245, 237, 216, 0.6)",
              border: "1px solid rgba(210,195,165,0.45)",
              boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="flex gap-1">
                {[0, 0.15, 0.3].map((delay, i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full"
                    style={{ animationDelay: `${delay}s`, background: "linear-gradient(135deg, #3DBFAC, #27A090)" }}
                  />
                ))}
              </span>
            </div>
            <p className="text-[12px] font-medium" style={{ color: "#4A5E6D" }}>
              {thinkingStatus.status}
            </p>
            {thinkingStatus.reasoning && (
              <p className="mt-1 text-[11px] italic" style={{ color: "#6A7E8D" }}>
                {thinkingStatus.reasoning}
              </p>
            )}
            {thinkingStatus.code && (
              <pre
                className="mt-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-mono overflow-hidden"
                style={{
                  background: "rgba(30, 45, 61, 0.05)",
                  color: "#4A5E6D",
                  maxHeight: "25em",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {thinkingStatus.code}
              </pre>
            )}
          </div>
        </div>
      )}
      {isLoading && !thinkingStatus && messages[messages.length - 1]?.role !== "assistant" && (
        <div className="flex justify-start">
          <div
            className="rounded-2xl rounded-tl-sm px-4 py-3"
            style={{
              background: "white",
              border: "1px solid rgba(210,195,165,0.45)",
              boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
            }}
          >
            <span className="flex gap-1">
              {[0, 0.15, 0.3].map((delay, i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-bounce rounded-full"
                  style={{ animationDelay: `${delay}s`, background: "linear-gradient(135deg, #3DBFAC, #27A090)" }}
                />
              ))}
            </span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
