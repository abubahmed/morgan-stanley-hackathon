"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  Fragment,
} from "react";
import type {
  ChatMessage,
  SandboxResult,
  IntentMode,
  UserInfo,
  ChatSession,
} from "@/types/chat";
import UserInfoModal from "./UserInfoModal";
import SessionSidebar from "./SessionSidebar";

// ─── localStorage key ────────────────────────────────────────────────────────
const LS_USER_KEY = "lt_user";

// ─── Lightweight markdown renderer ──────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  lines.forEach((line, li) => {
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
    if (line.trim() === "") {
      nodes.push(<div key={li} className="h-1.5" />);
      return;
    }
    nodes.push(<div key={li}>{inlineMarkdown(line)}</div>);
  });
  return <>{nodes}</>;
}

function inlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

// ─── Mode metadata ────────────────────────────────────────────────────────────
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

// ─── API response type ────────────────────────────────────────────────────────
type ChatAPIResponse =
  | { type: "conversation"; content: string }
  | { type: "analysis"; mode: IntentMode; sandboxResult: SandboxResult }
  | { type: "analysis_error"; error: string }
  | { type: "conversation_error"; error: string };

// ─── API helpers ──────────────────────────────────────────────────────────────
async function apiSendMessage(
  message: string,
  history: ChatMessage[],
  sessionId: string | null
): Promise<ChatAPIResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, sessionId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as ChatAPIResponse;
}

async function apiUpsertUser(
  info: Omit<UserInfo, "id" | "createdAt"> & { id?: string }
): Promise<UserInfo> {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(info),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to save user");
  return data.user as UserInfo;
}

async function apiCreateSession(
  userId: string,
  title = "New Chat"
): Promise<ChatSession> {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, title }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to create session");
  return data.session as ChatSession;
}

async function apiGetSessions(userId: string): Promise<ChatSession[]> {
  const res = await fetch(`/api/sessions?userId=${encodeURIComponent(userId)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to load sessions");
  return (data.sessions ?? []) as ChatSession[];
}

async function apiGetSession(sessionId: string): Promise<ChatSession> {
  const res = await fetch(`/api/sessions/${sessionId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Session not found");
  return data.session as ChatSession;
}

async function apiDeleteSession(sessionId: string): Promise<void> {
  await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
}

// ─── Welcome message ──────────────────────────────────────────────────────────
const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm your Lemon Tree Insights assistant. Ask me about pantry visit trends, food access patterns, or anything about the network. Try asking "show me visits last month" to run a live analysis.",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

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
      <div className="bg-white px-4 py-3">
        <p className="text-gray-800 text-sm leading-relaxed">{result.summary}</p>
      </div>
      {result.chartData && (
        <div className="bg-gray-50 border-t border-gray-100 px-4 py-3">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
            {result.chartData.title}
          </p>
          <div
            className="rounded-xl border-2 border-dashed border-gray-200 h-36 flex flex-col items-center justify-center gap-1 text-gray-400"
            data-chart-type={result.chartData.type}
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

function LemonAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-[#FFD93D] border-2 border-[#F5B800] flex items-center justify-center shrink-0 text-sm select-none shadow-sm">
      🍋
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

  return (
    <div className="flex justify-start items-end gap-2">
      <LemonAvatar />
      <div className="max-w-[78%] bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-800 shadow-sm leading-relaxed">
        {renderMarkdown(message.content)}
      </div>
    </div>
  );
}

// ─── Main ChatPanel ───────────────────────────────────────────────────────────

export default function ChatPanel() {
  // ── User state ──
  const [user, setUser] = useState<UserInfo | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);

  // ── Session state ──
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  // ── Chat state ──
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // ── UI state ──
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Bootstrap: load user from localStorage on mount ──
  useEffect(() => {
    const stored = localStorage.getItem(LS_USER_KEY);
    if (stored) {
      try {
        const u = JSON.parse(stored) as UserInfo;
        setUser(u);
        initSessions(u);
      } catch {
        localStorage.removeItem(LS_USER_KEY);
        setShowUserModal(true);
      }
    } else {
      setShowUserModal(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Session initialisation ──
  const initSessions = useCallback(async (u: UserInfo) => {
    try {
      const list = await apiGetSessions(u.id);
      setSessions(list);
      if (list.length === 0) {
        const session = await apiCreateSession(u.id);
        setSessions([session]);
        setCurrentSessionId(session.id);
        setMessages([WELCOME_MESSAGE]);
      } else {
        setCurrentSessionId(list[0].id);
        loadSessionMessages(list[0].id);
      }
    } catch (err) {
      console.error("Failed to init sessions:", err);
    }
  }, []);

  const loadSessionMessages = async (sessionId: string) => {
    setIsLoadingSession(true);
    try {
      const session = await apiGetSession(sessionId);
      const msgs = session.messages.filter((m) => !m.isLoading);
      setMessages(msgs.length > 0 ? msgs : [WELCOME_MESSAGE]);
    } catch {
      setMessages([WELCOME_MESSAGE]);
    } finally {
      setIsLoadingSession(false);
    }
  };

  // ── User form submit (new or edit) ──
  const handleUserSubmit = useCallback(
    async (info: Omit<UserInfo, "id" | "createdAt">) => {
      try {
        const saved = await apiUpsertUser(
          user ? { ...info, id: user.id } : info
        );
        localStorage.setItem(LS_USER_KEY, JSON.stringify(saved));
        setUser(saved);
        setShowUserModal(false);
        setIsEditingUser(false);
        if (!user) {
          // First-time setup
          initSessions(saved);
        }
      } catch (err) {
        console.error("Failed to save user:", err);
      }
    },
    [user, initSessions]
  );

  // ── Select a session ──
  const handleSelectSession = useCallback(
    (sessionId: string) => {
      if (sessionId === currentSessionId) {
        setSidebarOpen(false);
        return;
      }
      setCurrentSessionId(sessionId);
      loadSessionMessages(sessionId);
      setSidebarOpen(false);
    },
    [currentSessionId]
  );

  // ── Create a new session ──
  const handleNewSession = useCallback(async () => {
    if (!user) return;
    try {
      const session = await apiCreateSession(user.id);
      setSessions((prev) => [session, ...prev]);
      setCurrentSessionId(session.id);
      setMessages([WELCOME_MESSAGE]);
      setSidebarOpen(false);
      textareaRef.current?.focus();
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  }, [user]);

  // ── Delete a session ──
  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await apiDeleteSession(sessionId);
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));

        if (sessionId === currentSessionId) {
          // Switch to the next available session or create one
          const remaining = sessions.filter((s) => s.id !== sessionId);
          if (remaining.length > 0) {
            setCurrentSessionId(remaining[0].id);
            loadSessionMessages(remaining[0].id);
          } else if (user) {
            const newSession = await apiCreateSession(user.id);
            setSessions([newSession]);
            setCurrentSessionId(newSession.id);
            setMessages([WELCOME_MESSAGE]);
          }
        }
      } catch (err) {
        console.error("Failed to delete session:", err);
      }
    },
    [currentSessionId, sessions, user]
  );

  // ── Update session title optimistically in the sidebar list ──
  const refreshSessionTitle = useCallback(
    (sessionId: string, firstUserMessage: string) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId && s.title === "New Chat"
            ? {
                ...s,
                title:
                  firstUserMessage.length > 50
                    ? firstUserMessage.slice(0, 47) + "..."
                    : firstUserMessage,
                messageCount: s.messageCount + 1,
                updatedAt: Date.now(),
              }
            : s
        )
      );
    },
    []
  );

  // ── Send a message ──
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isProcessing) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    const loadingId = crypto.randomUUID();
    const loadingMsg: ChatMessage = {
      id: loadingId,
      role: "assistant",
      content: "",
      isLoading: true,
    };

    const historySnapshot = messages.filter((m) => !m.isLoading);

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setIsProcessing(true);

    // Optimistically update the sidebar session title
    if (currentSessionId) {
      refreshSessionTitle(currentSessionId, text);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? { ...s, messageCount: s.messageCount + 1 }
            : s
        )
      );
    }

    try {
      const response = await apiSendMessage(text, historySnapshot, currentSessionId);

      let assistantMsg: ChatMessage;

      if (response.type === "analysis") {
        assistantMsg = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.sandboxResult.summary,
          isAnalysis: true,
          mode: response.mode,
          sandboxResult: response.sandboxResult,
          timestamp: Date.now(),
        };
      } else if (response.type === "conversation") {
        assistantMsg = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.content,
          timestamp: Date.now(),
        };
      } else {
        assistantMsg = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "",
          error: response.error ?? "Something went wrong. Please try again.",
        };
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === loadingId ? assistantMsg : m))
      );

      // Keep sidebar count in sync with the assistant reply
      if (currentSessionId) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === currentSessionId
              ? { ...s, messageCount: s.messageCount + 1, updatedAt: Date.now() }
              : s
          )
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
  }, [input, isProcessing, messages, currentSessionId, refreshSessionTitle]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 font-sans">
      {/* ── Sidebar ── */}
      <SessionSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        user={user}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onEditUser={() => {
          setIsEditingUser(true);
          setShowUserModal(true);
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header */}
        <header className="bg-[#FFD93D] px-4 py-3 shadow-md shrink-0 flex items-center gap-3">
          {/* Hamburger (mobile) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-gray-800 hover:text-gray-900 shrink-0"
            aria-label="Open sidebar"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <div className="w-9 h-9 rounded-full bg-white/60 flex items-center justify-center text-xl shadow-sm shrink-0">
            🍋
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-gray-900 text-base leading-tight tracking-tight">
              Lemon Tree Insights
            </h1>
            <p className="text-gray-700 text-xs font-medium truncate">
              {user
                ? `Hi, ${user.name} · food pantry network`
                : "food pantry network · data analysis"}
            </p>
          </div>
        </header>

        {/* Message thread */}
        <div className="flex-1 overflow-y-auto px-4 py-5">
          {isLoadingSession ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.18}s` }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto flex flex-col gap-3">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="bg-white border-t border-gray-200 px-4 py-3 shrink-0">
          <div className="max-w-2xl mx-auto flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              disabled={isProcessing || isLoadingSession || !user}
              placeholder={
                !user
                  ? "Set up your profile to start chatting…"
                  : "Ask about pantry trends, visit patterns, food access…"
              }
              className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent disabled:opacity-50 transition-shadow"
              style={{ minHeight: "42px", maxHeight: "120px" }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing || !user}
              className="bg-[#FFD93D] hover:bg-[#F5C800] active:bg-[#e8bc00] disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors shrink-0 shadow-sm"
            >
              {isProcessing ? (
                <span className="flex items-center gap-1.5">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="w-1.5 h-1.5 rounded-full bg-gray-700 animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
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

      {/* ── User info modal ── */}
      {showUserModal && (
        <UserInfoModal
          existing={isEditingUser ? user : null}
          onSubmit={handleUserSubmit}
          onCancel={
            isEditingUser
              ? () => {
                  setShowUserModal(false);
                  setIsEditingUser(false);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
