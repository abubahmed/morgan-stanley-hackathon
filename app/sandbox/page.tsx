"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BarChart3, Menu } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import ChatThread from "@/components/sandbox/ChatThread";
import ChatInput from "@/components/sandbox/ChatInput";
import VisualizationPanel from "@/components/sandbox/VisualizationPanel";
import SessionSidebar from "@/components/sandbox/SessionSidebar";
import type { ChatMessage, AnalysisResult, Conversation } from "@/types/chat";
import { exportReportPdf } from "@/lib/exportPdf";

const STORAGE_KEY = "lt_conversations";

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

// ── localStorage helpers ──

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as Conversation[]).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function saveConversations(convs: Conversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
}

function createConversation(): Conversation {
  return {
    id: generateId(),
    title: "New Chat",
    messages: [],
    analysisResults: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ── Main component ──

function SandboxInner() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Track whether we've initialized from localStorage
  const initialized = useRef(false);

  // Load conversations from localStorage on mount
  useEffect(() => {
    const saved = loadConversations();
    setConversations(saved);

    if (saved.length > 0) {
      // Load the most recent conversation
      const latest = saved[0];
      setCurrentId(latest.id);
      setMessages(latest.messages);
      setAnalysisResults(latest.analysisResults);
    } else {
      // Create a first conversation
      const conv = createConversation();
      setConversations([conv]);
      setCurrentId(conv.id);
      saveConversations([conv]);
    }

    initialized.current = true;
  }, []);

  // Persist current conversation to localStorage whenever messages or analysis results change
  useEffect(() => {
    if (!initialized.current || !currentId) return;

    setConversations((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== currentId) return c;

        // Derive title from first user message
        const firstUserMsg = messages.find((m) => m.role === "user");
        const title = firstUserMsg
          ? firstUserMsg.content.length > 40
            ? firstUserMsg.content.slice(0, 37) + "..."
            : firstUserMsg.content
          : "New Chat";

        return {
          ...c,
          title,
          // Store messages — preserve reportIndex, strip isStreaming
          messages: messages.map((m) => {
            const saved: ChatMessage = { id: m.id, role: m.role, content: m.content };
            if (m.reportIndex != null) saved.reportIndex = m.reportIndex;
            return saved;
          }),
          // Store analysis results — keep text, strip base64 images (too large for localStorage)
          analysisResults: analysisResults.map((r) => ({ answer: r.answer, images: r.images })),
          updatedAt: Date.now(),
        };
      });
      saveConversations(updated);
      return updated;
    });
  }, [messages, analysisResults, currentId]);

  // ── Session actions ──

  const handleNew = useCallback(() => {
    const conv = createConversation();
    setConversations((prev) => {
      const updated = [conv, ...prev];
      saveConversations(updated);
      return updated;
    });
    setCurrentId(conv.id);
    setMessages([]);
    setAnalysisResults([]);
    setPanelOpen(false);
  }, []);

  const handleSelect = useCallback((id: string) => {
    setConversations((prev) => {
      const conv = prev.find((c) => c.id === id);
      if (conv) {
        setCurrentId(id);
        setMessages(conv.messages);
        setAnalysisResults(conv.analysisResults);
        setPanelOpen(conv.analysisResults.length > 0);
      }
      return prev;
    });
    setSidebarOpen(false);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveConversations(updated);

      if (id === currentId) {
        if (updated.length > 0) {
          const next = updated[0];
          setCurrentId(next.id);
          setMessages(next.messages);
          setAnalysisResults(next.analysisResults);
        } else {
          const conv = createConversation();
          updated.push(conv);
          saveConversations(updated);
          setCurrentId(conv.id);
          setMessages([]);
          setAnalysisResults([]);
        }
      }
      return updated;
    });
  }, [currentId]);

  const openReport = useCallback((index: number) => {
    setActiveReportTab(index);
    setPanelOpen(true);
  }, []);

  const downloadReport = useCallback((index: number) => {
    const result = analysisResults[index];
    if (result) exportReportPdf(result, index + 1);
  }, [analysisResults]);

  // ── Send message ──

  const sendMessage = useCallback(
    async (userText: string) => {
      if (isStreaming) return;

      const userMsg: ChatMessage = { id: generateId(), role: "user", content: userText };
      const assistantId = generateId();
      const assistantMsg: ChatMessage = { id: assistantId, role: "assistant", content: "", isStreaming: true };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      // Build history for API — include analysis text as assistant messages
      const history = [...messages, userMsg]
        .filter((m) => !m.isStreaming)
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
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

              if (event.type === "text") {
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + (event.content as string) } : m))
                );
              } else if (event.type === "analysis") {
                const answer = event.answer as string;
                const images = (event.images as string[]) ?? [];
                setAnalysisResults((prev) => {
                  const newIndex = prev.length;
                  // Tag the current assistant message with this report's index
                  setMessages((msgs) =>
                    msgs.map((m) => (m.id === assistantId ? { ...m, reportIndex: newIndex } : m))
                  );
                  return [...prev, { answer, images }];
                });
              } else if (event.type === "done" || event.type === "error") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          isStreaming: false,
                          content: event.type === "error" ? (event.message as string) : m.content,
                        }
                      : m
                  )
                );
              }
            } catch {
              /* skip malformed events */
            }
          }
        }
      } catch (err) {
        console.error("Chat error:", err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false, content: "Something went wrong. Please try again." } : m
          )
        );
      } finally {
        setIsStreaming(false);
        setMessages((prev) => prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)));
      }
    },
    [isStreaming, messages]
  );

  // Auto-send initial query from URL
  useEffect(() => {
    if (initialQuery && messages.length === 0 && initialized.current) {
      sendMessage(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const vizCount = analysisResults.length;

  return (
    <div className="flex h-screen flex-col" style={{ backgroundColor: "#F5EDD8" }}>
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <SessionSidebar
          conversations={conversations}
          currentId={currentId}
          onSelect={handleSelect}
          onNew={handleNew}
          onDelete={handleDelete}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Chat panel */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center justify-between border-b bg-white px-4 py-3"
            style={{ borderColor: "#EDE2C4" }}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen((o) => !o)}
                className="md:hidden rounded-lg p-1 transition hover:bg-[#F5EDD8]"
                style={{ color: "#4A5E6D" }}>
                <Menu size={16} />
              </button>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#1E2D3D" }}>
                  AI Sandbox
                </p>
              </div>
            </div>
            {!panelOpen && (
              <button
                onClick={() => setPanelOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition hover:bg-[#F5EDD8]"
                style={{ borderColor: "#EDE2C4", color: "#4A5E6D", backgroundColor: "white" }}>
                <BarChart3 size={13} />
                {vizCount > 0 ? `${vizCount} report${vizCount > 1 ? "s" : ""}` : "Reports"}
              </button>
            )}
          </div>

          <ChatThread messages={messages} isLoading={isStreaming} onOpenReport={openReport} onDownloadReport={downloadReport} />
          <ChatInput onSend={sendMessage} isDisabled={isStreaming} />
        </div>

        <VisualizationPanel analysisResults={analysisResults} activeTab={activeReportTab} onTabChange={setActiveReportTab} isVisible={panelOpen} onToggle={() => setPanelOpen(false)} />
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
