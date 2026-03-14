"use client";

import { useEffect, useRef } from "react";
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
      <div className="flex flex-1 flex-col items-center justify-center text-center text-gray-400 px-6">
        <p className="text-4xl mb-3">🌿</p>
        <p className="text-sm font-medium text-gray-600">Ask anything about food access data</p>
        <p className="mt-1 text-xs text-gray-400">
          Try: &ldquo;Show me resources in zip code 10001&rdquo; or &ldquo;Why do some pantries have lower ratings?&rdquo;
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
      {messages.map((msg) => (
        <ChatMessageBubble key={msg.id} message={msg} />
      ))}
      {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
        <div className="flex justify-start">
          <div className="rounded-2xl rounded-tl-sm border border-gray-200 bg-white px-4 py-3 text-sm text-gray-400 shadow-sm">
            <span className="flex gap-1">
              <span className="animate-bounce">.</span>
              <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
            </span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
