"use client";

import { useState } from "react";

const exampleQueries = [
  "Which zip codes have the highest unmet food needs?",
  "Show correlation between food bank locations and poverty rates",
  "Compare our distribution reach to regional averages",
  "Identify optimal locations for new distribution sites",
];

export default function SandboxPage() {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // placeholder for AI query submission
  };

  return (
    <main style={{ backgroundColor: "#FAF7F0" }} className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
          style={{ backgroundColor: "#e8f7f4" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <path d="M17 8C8 10 5.9 16.17 3.82 19.34C3.45 19.9 4.14 20.5 4.67 20.1C7.5 17.9 9.5 16 12 16C14.5 16 16 17.5 16 17.5C20 15 22 10 21 6C19 4 14.5 5 12 7C10 8.5 9 11 9 11C9 11 11 8 17 8Z" fill="#3DBFA6"/>
          </svg>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold mb-3 text-center" style={{ color: "#1a1a2e" }}>
          Ask About Food Access Data
        </h1>
        <p className="text-base text-center max-w-md mb-12" style={{ color: "#6b7280" }}>
          Explore insights, analyze trends, and get answers about food distribution and community needs.
        </p>

        {/* Example Cards */}
        <div className="w-full max-w-2xl mb-16">
          <p className="text-sm font-medium mb-4" style={{ color: "#4b5563" }}>Try these examples:</p>
          <div className="grid grid-cols-2 gap-3">
            {exampleQueries.map((q) => (
              <button
                key={q}
                onClick={() => setQuery(q)}
                className="flex items-start gap-3 p-4 rounded-xl text-left transition-colors hover:shadow-sm"
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e0d5",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 flex-shrink-0">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="#3DBFA6" strokeWidth="2"/>
                  <polyline points="9 11 12 14 22 4" stroke="#3DBFA6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-sm" style={{ color: "#374151" }}>{q}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky bottom search bar */}
      <div className="sticky bottom-0 w-full pb-6 px-6" style={{ backgroundColor: "#FAF7F0" }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-xs text-center mb-3" style={{ color: "#9ca3af" }}>
            Powered by Lemon Tree Insights AI &bull; Data is for demonstration purposes
          </p>
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white shadow-sm"
              style={{ border: "1px solid #e5e0d5" }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question about food access data..."
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: "#1a1a2e" }}
              />
              <button
                type="submit"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ backgroundColor: "#3DBFA6" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <line x1="22" y1="2" x2="11" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="white"/>
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
