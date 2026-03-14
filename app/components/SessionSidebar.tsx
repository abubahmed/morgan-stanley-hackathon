"use client";

import { useState } from "react";
import type { ChatSession, UserInfo } from "@/types/chat";

interface SessionSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  user: UserInfo | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onEditUser: () => void;
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
  onEditUser,
  isOpen,
  onClose,
}: SessionSidebarProps) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPendingDelete(id);
  };

  const handleConfirmDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDeleteSession(id);
    setPendingDelete(null);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDelete(null);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-10 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 bottom-0 z-20
          md:relative md:z-auto
          w-72 shrink-0 bg-gray-900 flex flex-col h-full
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* User profile strip */}
        <div className="px-4 py-4 border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#FFD93D] flex items-center justify-center text-sm font-extrabold text-gray-900 shrink-0 select-none">
              {user?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate leading-tight">
                {user?.name ?? "Guest"}
              </p>
              <p className="text-gray-400 text-xs truncate">
                {user?.role ?? "community"}
                {user?.organization ? ` · ${user.organization}` : ""}
              </p>
            </div>
            <button
              onClick={onEditUser}
              title="Edit profile"
              className="text-gray-500 hover:text-white transition-colors shrink-0"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* New chat button */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          <button
            onClick={onNewSession}
            className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white text-sm font-semibold px-3 py-2.5 rounded-xl transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Chat
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {sessions.length === 0 ? (
            <p className="text-gray-500 text-xs text-center mt-10 px-4 leading-relaxed">
              No chats yet.
              <br />
              Start a new conversation!
            </p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {sessions.map((session) => {
                const isActive = session.id === currentSessionId;
                const isDeleting = session.id === pendingDelete;

                return (
                  <div
                    key={session.id}
                    onClick={() => !isDeleting && onSelectSession(session.id)}
                    className={`
                      group relative flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer
                      transition-colors select-none
                      ${isActive
                        ? "bg-gray-600 text-white"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                      }
                    `}
                  >
                    <svg
                      className="w-4 h-4 mt-0.5 shrink-0 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>

                    <div className="flex-1 min-w-0">
                      {isDeleting ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs text-red-400">Delete?</span>
                          <button
                            onClick={(e) => handleConfirmDelete(e, session.id)}
                            className="text-xs text-red-400 hover:text-red-300 font-bold"
                          >
                            Yes
                          </button>
                          <button
                            onClick={handleCancelDelete}
                            className="text-xs text-gray-400 hover:text-white"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm leading-snug truncate">
                            {session.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {session.messageCount} msg
                            {session.messageCount !== 1 ? "s" : ""} ·{" "}
                            {timeAgo(session.updatedAt)}
                          </p>
                        </>
                      )}
                    </div>

                    {!isDeleting && (
                      <button
                        onClick={(e) => handleDeleteClick(e, session.id)}
                        title="Delete chat"
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-gray-500 hover:text-red-400 mt-0.5"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-700 shrink-0">
          <p className="text-gray-600 text-xs text-center">
            🍋 Lemon Tree Insights
          </p>
        </div>
      </aside>
    </>
  );
}
