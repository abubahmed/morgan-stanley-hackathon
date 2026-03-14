"use client";

import { useState, useRef, type KeyboardEvent } from "react";

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
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput() {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      <div className="flex items-end gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 focus-within:border-lt-green-400 focus-within:ring-2 focus-within:ring-lt-green-100 transition">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={isDisabled}
          placeholder="Ask about food access data… (Enter to send, Shift+Enter for newline)"
          className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={isDisabled || !value.trim()}
          className="mb-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-lt-green-600 text-white transition hover:bg-lt-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ↑
        </button>
      </div>
      <p className="mt-1 text-center text-xs text-gray-400">
        AI can make mistakes. Verify important information from official sources.
      </p>
    </div>
  );
}
