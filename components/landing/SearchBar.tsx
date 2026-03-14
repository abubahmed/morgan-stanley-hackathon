"use client";

import { useState, type FormEvent } from "react";

interface SearchBarProps {
  onSubmit: (query: string) => void;
  initialValue?: string;
  placeholder?: string;
  isLoading?: boolean;
}

export default function SearchBar({
  onSubmit,
  initialValue = "",
  placeholder = "What are you trying to understand today?",
  isLoading = false,
}: SearchBarProps) {
  const [value, setValue] = useState(initialValue);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (value.trim()) onSubmit(value.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-800 shadow-sm outline-none transition focus:border-lt-green-500 focus:ring-2 focus:ring-lt-green-100"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading || !value.trim()}
        className="rounded-xl bg-lt-green-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-lt-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "..." : "Analyze"}
      </button>
    </form>
  );
}
