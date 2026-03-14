"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import ChatThread from "@/components/sandbox/ChatThread";
import ChatInput from "@/components/sandbox/ChatInput";
import VisualizationPanel from "@/components/sandbox/VisualizationPanel";
import type { ChatMessage, ChartSpec, AIMode, UserRole } from "@/types/chat";

function generateId() {
  return Math.random().toString(36).slice(2);
}

function SandboxInner() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const role = (searchParams.get("role") ?? "community") as UserRole;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [charts, setCharts] = useState<ChartSpec[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const sendMessage = useCallback(
    async (userText: string) => {
      if (isStreaming) return;

      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content: userText,
      };

      const assistantId = generateId();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      // Build Anthropic-compatible message history (exclude streaming state)
      const history = [
        ...messages,
        userMsg,
      ].map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, role }),
        });

        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === "mode") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, mode: event.mode as AIMode } : m
                  )
                );
              } else if (event.type === "text") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + event.content }
                      : m
                  )
                );
              } else if (event.type === "chart") {
                setCharts((prev) => [...prev, event.spec as ChartSpec]);
                setPanelOpen(true);
              } else if (event.type === "done" || event.type === "error") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          isStreaming: false,
                          content:
                            event.type === "error"
                              ? event.message
                              : m.content,
                        }
                      : m
                  )
                );
              }
            } catch {
              // skip malformed events
            }
          }
        }
      } catch (err) {
        console.error("Chat error:", err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, isStreaming: false, content: "Something went wrong. Please try again." }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
        setMessages((prev) =>
          prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
        );
      }
    },
    [isStreaming, messages, role]
  );

  // Auto-send initial query from URL
  useEffect(() => {
    if (initialQuery && messages.length === 0) {
      sendMessage(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Chat panel */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-800">AI Sandbox</p>
              <p className="text-xs text-gray-400">
                Query · Exploration · Investigation modes
              </p>
            </div>
            {!panelOpen && (
              <button
                onClick={() => setPanelOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
              >
                📊 {charts.length > 0 ? `${charts.length} chart${charts.length > 1 ? "s" : ""}` : "Visualizations"}
              </button>
            )}
          </div>

          <ChatThread messages={messages} isLoading={isStreaming} />
          <ChatInput onSend={sendMessage} isDisabled={isStreaming} />
        </div>

        {/* Visualization panel */}
        <VisualizationPanel
          charts={charts}
          isVisible={panelOpen}
          onToggle={() => setPanelOpen(false)}
        />
      </div>
    </div>
  );
}

export default function SandboxPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-gray-400">Loading...</div>}>
      <SandboxInner />
    </Suspense>
  );
}
