"use client";

import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";

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
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#9EB0BA" }} />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus-within:shadow-md"
          style={{
            border: "1.5px solid rgba(61,191,172,0.2)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
            color: "#1E2D3D",
          }}
        />
      </div>
      <button
        type="submit"
        disabled={isLoading || !value.trim()}
        className="rounded-2xl px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: "linear-gradient(135deg, #3DBFAC 0%, #27A090 100%)" }}
      >
        {isLoading ? "..." : "Analyze"}
      </button>
    </form>
  );
}
