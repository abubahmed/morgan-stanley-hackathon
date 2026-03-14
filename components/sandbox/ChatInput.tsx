"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { Search, ArrowUp } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  isDisabled?: boolean;
}

export default function ChatInput({ onSend, isDisabled = false }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || isDisabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function handleInput() {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }

  return (
    <div
      className="border-t px-4 py-3"
      style={{ borderColor: "rgba(210,195,165,0.5)", background: "linear-gradient(180deg, #F5EDD8 0%, #EEE2C4 100%)" }}
    >
      <div
        className="flex items-end gap-2.5 rounded-2xl bg-white px-4 py-3 transition-shadow focus-within:shadow-md"
        style={{
          border: "1.5px solid rgba(210,195,165,0.5)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <Search size={15} className="mb-0.5 shrink-0" style={{ color: "#B0C0CC" }} />
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={isDisabled}
          placeholder="Ask about food access data… (Enter to send, Shift+Enter for newline)"
          className="flex-1 resize-none bg-transparent text-[13px] outline-none placeholder-[#B0C0CC] disabled:opacity-50"
          style={{ color: "#1E2D3D" }}
        />
        <button
          onClick={handleSend}
          disabled={isDisabled || !value.trim()}
          className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition-all hover:shadow-md hover:opacity-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
          style={{ background: "linear-gradient(135deg, #3DBFAC 0%, #27A090 100%)" }}
        >
          <ArrowUp size={14} />
        </button>
      </div>
      <p className="mt-1.5 text-center text-[11px]" style={{ color: "#9AAAB8" }}>
        AI can make mistakes. Verify important information from official sources.
      </p>
    </div>
  );
}
