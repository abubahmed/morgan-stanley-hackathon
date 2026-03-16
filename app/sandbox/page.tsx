"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BarChart3, Menu } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import ChatThread from "@/components/sandbox/ChatThread";
import ChatInput from "@/components/sandbox/ChatInput";
import VisualizationPanel from "@/components/sandbox/VisualizationPanel";
import SessionSidebar from "@/components/sandbox/SessionSidebar";
import UserInfoModal from "@/components/sandbox/UserInfoModal";
import type { ChatMessage, ChartSpec, MapSpec, AIMode, UserRole, UserInfo, ChatSession } from "@/types/chat";

const USER_KEY = "lt_user_id";

function generateId() {
  return Math.random().toString(36).slice(2);
}

function SandboxInner() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const role = (searchParams.get("role") ?? "community") as UserRole;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [charts, setCharts] = useState<ChartSpec[]>([]);
  const [maps, setMaps] = useState<MapSpec[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Session persistence
  const [user, setUser] = useState<UserInfo | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedId = localStorage.getItem(USER_KEY);
    if (!savedId) {
      setShowUserModal(true);
      return;
    }
    fetch(`/api/sessions?userId=${savedId}`)
      .then((r) => r.json())
      .then((data: { sessions?: ChatSession[] }) => {
        if (data.sessions) setSessions(data.sessions as ChatSession[]);
      })
      .catch(() => {});
    // Reconstruct minimal user info from localStorage
    const savedUser = localStorage.getItem("lt_user");
    if (savedUser) {
      try { setUser(JSON.parse(savedUser) as UserInfo); } catch { /* ignore */ }
    }
  }, []);

  const handleUserSubmit = useCallback(async (info: Omit<UserInfo, "id" | "createdAt">) => {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "pending", title: "New Chat" }),
    });
    // Create user via upsert (simplified: just store locally)
    const newUser: UserInfo = { ...info, id: crypto.randomUUID(), createdAt: Date.now() };
    setUser(newUser);
    localStorage.setItem(USER_KEY, newUser.id);
    localStorage.setItem("lt_user", JSON.stringify(newUser));
    setShowUserModal(false);
    // Create first session
    const sessRes = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: newUser.id }),
    });
    const { session } = await sessRes.json() as { session: ChatSession };
    setCurrentSessionId(session.id);
    setSessions([session]);
    void res; // unused
  }, []);

  const handleNewSession = useCallback(async () => {
    if (!user) return;
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    const { session } = await res.json() as { session: ChatSession };
    setCurrentSessionId(session.id);
    setSessions((prev) => [session, ...prev]);
    setMessages([]);
    setCharts([]);
    setMaps([]);
    setImages([]);
  }, [user]);

  const handleSelectSession = useCallback(async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setCharts([]);
    setMaps([]);
    setImages([]);
    setSidebarOpen(false);
    // Load saved messages for this session
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json() as { messages?: ChatMessage[] };
      setMessages(data.messages ?? []);
    } catch {
      setMessages([]);
    }
  }, []);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    await fetch(`/api/sessions?sessionId=${sessionId}`, { method: "DELETE" });
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([]);
      setCharts([]);
      setMaps([]);
      setImages([]);
    }
  }, [currentSessionId]);

  const sendMessage = useCallback(
    async (userText: string) => {
      if (isStreaming) return;

      const userMsg: ChatMessage = { id: generateId(), role: "user", content: userText };
      const assistantId = generateId();
      const assistantMsg: ChatMessage = { id: assistantId, role: "assistant", content: "", isStreaming: true };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      // Persist user message
      if (currentSessionId) {
        fetch("/api/chat", { method: "HEAD" }).catch(() => {}); // warm up
        await fetch(`/api/sessions/${currentSessionId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMsg }),
        }).catch(() => {});
      }

      const history = [...messages, userMsg].map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      let finalContent = "";

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, role, sessionId: currentSessionId }),
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
                  prev.map((m) => m.id === assistantId ? { ...m, mode: event.mode as AIMode } : m)
                );
              } else if (event.type === "text") {
                finalContent += event.content as string;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: m.content + (event.content as string) } : m
                  )
                );
              } else if (event.type === "chart") {
                setCharts((prev) => [...prev, event.spec as ChartSpec]);
                setPanelOpen(true);
              } else if (event.type === "map") {
                setMaps((prev) => [...prev, event.spec as MapSpec]);
                setPanelOpen(true);
              } else if (event.type === "images") {
                setImages((prev) => [...prev, ...(event.images as string[])]);
                setPanelOpen(true);
              } else if (event.type === "done" || event.type === "error") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, isStreaming: false, content: event.type === "error" ? (event.message as string) : m.content }
                      : m
                  )
                );
              }
            } catch { /* skip malformed events */ }
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
        setMessages((prev) => prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)));
        // Save assistant reply
        if (currentSessionId && finalContent) {
          const assistantMsg: ChatMessage = { id: assistantId, role: "assistant", content: finalContent };
          fetch(`/api/sessions/${currentSessionId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: assistantMsg }),
          }).catch(() => {});
        }
        // Refresh sessions list
        if (user) {
          fetch(`/api/sessions?userId=${user.id}`)
            .then((r) => r.json())
            .then((data: { sessions?: ChatSession[] }) => { if (data.sessions) setSessions(data.sessions as ChatSession[]); })
            .catch(() => {});
        }
      }
    },
    [isStreaming, messages, role, currentSessionId, user]
  );

  // Auto-send initial query from URL
  useEffect(() => {
    if (initialQuery && messages.length === 0 && !showUserModal) {
      sendMessage(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showUserModal]);

  const vizCount = charts.length + maps.length;

  return (
    <div className="flex h-screen flex-col" style={{ backgroundColor: "#F5EDD8" }}>
      {showUserModal && (
        <UserInfoModal onSubmit={handleUserSubmit} />
      )}

      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Session sidebar */}
        {user && (
          <SessionSidebar
            sessions={sessions}
            currentSessionId={currentSessionId}
            user={user}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onDeleteSession={handleDeleteSession}
            onEditUser={() => setShowUserModal(true)}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        {/* Chat panel */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-white px-4 py-3"
            style={{ borderColor: "#EDE2C4" }}>
            <div className="flex items-center gap-3">
              {user && (
                <button
                  onClick={() => setSidebarOpen((o) => !o)}
                  className="md:hidden rounded-lg p-1 transition hover:bg-[#F5EDD8]"
                  style={{ color: "#4A5E6D" }}
                >
                  <Menu size={16} />
                </button>
              )}
              <div>
                <p className="text-sm font-semibold" style={{ color: "#1E2D3D" }}>AI Sandbox</p>
                <p className="text-xs" style={{ color: "#4A5E6D" }}>
                  Query · Exploration · Investigation modes
                </p>
              </div>
            </div>
            {!panelOpen && (
              <button
                onClick={() => setPanelOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition hover:bg-[#F5EDD8]"
                style={{ borderColor: "#EDE2C4", color: "#4A5E6D", backgroundColor: "white" }}
              >
                <BarChart3 size={13} />
                {vizCount > 0 ? `${vizCount} viz` : "Visualizations"}
              </button>
            )}
          </div>

          <ChatThread messages={messages} isLoading={isStreaming} />
          <ChatInput onSend={sendMessage} isDisabled={isStreaming} />
        </div>

        {/* Visualization panel */}
        <VisualizationPanel
          charts={charts}
          maps={maps}
          images={images}
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
