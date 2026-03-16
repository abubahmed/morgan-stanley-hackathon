"use client";

import { useState } from "react";
import type { ChatSession, UserInfo } from "@/types/chat";
import { MessageSquare, Plus, Trash2 } from "lucide-react";

interface SessionSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  user: UserInfo | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SessionSidebar({
  sessions,
  currentSessionId,
  user,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  isOpen,
  onClose,
}: SessionSidebarProps) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-10 md:hidden" onClick={onClose} />
      )}
      <aside
        className={`
          fixed left-0 top-0 bottom-0 z-20
          md:relative md:z-auto
          w-64 shrink-0 flex flex-col h-full
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        style={{ background: "#1E2D3D", borderRight: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* User profile */}
        <div className="px-4 py-4 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: "linear-gradient(135deg, #3DBFAC 0%, #27A090 100%)", color: "white" }}
            >
              {user?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[13px] font-semibold truncate leading-tight">{user?.name ?? "Guest"}</p>
            </div>
          </div>
        </div>

        {/* New chat */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          <button
            onClick={onNewSession}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-white transition-all active:scale-[0.97]"
            style={{ background: "linear-gradient(135deg, #3DBFAC 0%, #27A090 100%)" }}
          >
            <Plus size={14} />
            New Chat
          </button>
        </div>

        {/* Section label */}
        <div className="px-4 pt-3 pb-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "rgba(255,255,255,0.25)" }}>
            Recent
          </p>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {sessions.length === 0 ? (
            <p className="text-[11px] text-center mt-10 px-4 leading-relaxed" style={{ color: "#4A5E6D" }}>
              No chats yet. Start a new conversation!
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {sessions.map((session) => {
                const isActive = session.id === currentSessionId;
                const isDeleting = session.id === pendingDelete;
                return (
                  <div
                    key={session.id}
                    onClick={() => !isDeleting && onSelectSession(session.id)}
                    className="group relative flex items-start gap-2.5 px-3 py-3 rounded-xl cursor-pointer transition-all select-none"
                    style={{
                      background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                      borderLeft: isActive ? "2px solid #3DBFAC" : "2px solid transparent",
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? "rgba(255,255,255,0.08)" : "transparent"; }}
                  >
                    <div
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: isActive ? "rgba(61,191,172,0.15)" : "rgba(255,255,255,0.05)" }}
                    >
                      <MessageSquare size={12} style={{ color: isActive ? "#3DBFAC" : "#5A6E7D" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      {isDeleting ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-red-400">Delete?</span>
                          <button onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); setPendingDelete(null); }}
                            className="text-[11px] text-red-400 hover:text-red-300 font-bold">Yes</button>
                          <button onClick={(e) => { e.stopPropagation(); setPendingDelete(null); }}
                            className="text-[11px]" style={{ color: "#8A9AAA" }}>No</button>
                        </div>
                      ) : (
                        <>
                          <p className="text-[13px] leading-snug truncate font-medium" style={{ color: isActive ? "#fff" : "#94A3B8" }}>
                            {session.title}
                          </p>
                          <p className="text-[10px] mt-0.5" style={{ color: isActive ? "rgba(61,191,172,0.7)" : "#3D4F5F" }}>
                            {session.messageCount} msg{session.messageCount !== 1 ? "s" : ""} · {timeAgo(session.updatedAt)}
                          </p>
                        </>
                      )}
                    </div>
                    {!isDeleting && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setPendingDelete(session.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1"
                        style={{ color: "#4A5E6D" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#4A5E6D")}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
