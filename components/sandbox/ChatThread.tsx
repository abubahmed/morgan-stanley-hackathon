"use client";

import { useEffect, useRef } from "react";
import { Leaf } from "lucide-react";
import type { ChatMessage } from "@/types/chat";
import ChatMessageBubble from "./ChatMessage";

interface ChatThreadProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export default function ChatThread({ messages, isLoading }: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        <ChatMessageBubble key={msg.id} message={msg} />
      ))}
      {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
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
