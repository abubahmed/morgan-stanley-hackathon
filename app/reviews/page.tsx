"use client";

import { useState } from "react";

type Status = "Completed" | "Flagged" | "Pending";
type ActionKey = "clientFlag" | "resourceFlag" | "shareSocial" | "followUp";

interface ReviewEntry {
  id: string;
  name: string;
  status: Status;
  tickets: number;
  stars: number;
  date: string;
  location: string;
  text: string;
  referredBy: string;
  referredRole: string;
  actionsTaken: string[];
}

const INITIAL_REVIEWS: ReviewEntry[] = [
  {
    id: "REV-001",
    name: "Maria Rodriguez",
    status: "Completed",
    tickets: 5,
    stars: 5,
    date: "2026-03-14",
    location: "Main Street Food Bank",
    text: "The food pantry was well-stocked and the volunteers were incredibly kind. They helped me find culturally appropriate foods for my family.",
    referredBy: "Sarah Chen",
    referredRole: "Volunteer",
    actionsTaken: ["Shared to Social", "Follow-up Sent"],
  },
  {
    id: "REV-002",
    name: "James Wilson",
    status: "Flagged",
    tickets: 3,
    stars: 2,
    date: "2026-03-13",
    location: "Riverside Community Center",
    text: "Good service but they ran out of fresh produce by the time I arrived. Would appreciate if they could stock more vegetables.",
    referredBy: "Michael Brown",
    referredRole: "Outreach",
    actionsTaken: ["Resource Flag Created"],
  },
  {
    id: "REV-003",
    name: "Lisa Thompson",
    status: "Pending",
    tickets: 4,
    stars: 4,
    date: "2026-03-12",
    location: "Oak Park Distribution",
    text: "Great experience overall. The wait time was a bit long but the staff made it worth it with their warmth and care.",
    referredBy: "Direct Visit",
    referredRole: "",
    actionsTaken: [],
  },
  {
    id: "REV-004",
    name: "Robert Martinez",
    status: "Flagged",
    tickets: 2,
    stars: 2,
    date: "2026-03-11",
    location: "Main Street Food Bank",
    text: "I appreciate the help but I have specific dietary needs that weren't accommodated. I need diabetic-friendly options.",
    referredBy: "Emily Davis",
    referredRole: "Healthcare",
    actionsTaken: ["Client Flag Created", "Resource Flag Created", "Follow-up Sent"],
  },
  {
    id: "REV-005",
    name: "Patricia Johnson",
    status: "Completed",
    tickets: 5,
    stars: 5,
    date: "2026-03-10",
    location: "Westside Pantry",
    text: "Wonderful service! Found everything I needed and the volunteers even helped me carry groceries to my car. So grateful for this resource.",
    referredBy: "Jessica Lee",
    referredRole: "Community",
    actionsTaken: [],
  },
];

const statusStyles: Record<Status, { bg: string; color: string }> = {
  Completed: { bg: "#d1fae5", color: "#065f46" },
  Flagged: { bg: "#fee2e2", color: "#b91c1c" },
  Pending: { bg: "#fef3c7", color: "#92400e" },
};

const ACTION_LABELS: Record<ActionKey, string> = {
  clientFlag: "Client Flag",
  resourceFlag: "Resource Flag",
  shareSocial: "Share Social",
  followUp: "Follow-up",
};

const ACTION_TAKEN_LABELS: Record<ActionKey, string> = {
  clientFlag: "Client Flag Created",
  resourceFlag: "Resource Flag Created",
  shareSocial: "Shared to Social",
  followUp: "Follow-up Sent",
};

export default function ReviewsPage() {
  const [filter, setFilter] = useState<"All" | Status>("All");
  const [search, setSearch] = useState("");
  const [reviews, setReviews] = useState(INITIAL_REVIEWS);

  const handleAction = (reviewId: string, action: ActionKey) => {
    const label = ACTION_TAKEN_LABELS[action];
    setReviews((prev) =>
      prev.map((r) => {
        if (r.id !== reviewId) return r;
        if (r.actionsTaken.includes(label)) return r;
        return { ...r, actionsTaken: [...r.actionsTaken, label] };
      })
    );
  };

  const filtered = reviews.filter((r) => {
    const matchesFilter = filter === "All" || r.status === filter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.location.toLowerCase().includes(q) ||
      r.referredBy.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const totalReviews = reviews.length;
  const avgRating = (reviews.reduce((s, r) => s + r.stars, 0) / reviews.length).toFixed(1);
  const totalTickets = reviews.reduce((s, r) => s + r.tickets, 0);
  const pendingCount = reviews.filter((r) => r.status === "Pending").length;

  return (
    <main style={{ backgroundColor: "#FAF7F0" }} className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4"
            style={{ backgroundColor: "#e8f7f4", color: "#2ea890", border: "1px solid #c5ede7" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#3DBFA6"/>
            </svg>
            Client Feedback
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#1a1a2e" }}>Client Reviews</h1>
          <p className="text-base" style={{ color: "#6b7280" }}>
            Manage client feedback, track volunteer referrals, and take action on service quality.
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { value: totalReviews.toString(), label: "Total Reviews" },
            { value: avgRating, label: "Average Rating", suffix: "⭐" },
            { value: totalTickets.toString(), label: "Raffle Tickets", suffix: "🎟" },
            { value: pendingCount.toString(), label: "Pending Action" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl p-5 bg-white"
              style={{ border: "1px solid #e5e0d5" }}
            >
              <p className="text-3xl font-bold mb-1" style={{ color: "#1a1a2e" }}>
                {stat.value}
                {stat.suffix && (
                  <span className="text-xl ml-1">{stat.suffix}</span>
                )}
              </p>
              <p className="text-sm" style={{ color: "#6b7280" }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white"
            style={{ border: "1px solid #e5e0d5" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="#9ca3af" strokeWidth="2"/>
              <path d="M21 21L16.65 16.65" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reviews, clients, or volunteers..."
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: "#1a1a2e" }}
            />
          </div>

          <div className="flex items-center rounded-xl overflow-hidden" style={{ border: "1px solid #e5e0d5" }}>
            {(["All", "Pending", "Flagged", "Completed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-4 py-2.5 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: filter === f ? "#3DBFA6" : "#ffffff",
                  color: filter === f ? "white" : "#4b5563",
                  borderRight: f !== "Completed" ? "1px solid #e5e0d5" : "none",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Review Cards */}
        <div className="flex flex-col gap-4">
          {filtered.map((review) => (
            <ReviewCard key={review.id} review={review} onAction={handleAction} />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16" style={{ color: "#9ca3af" }}>
              No reviews match your filter.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

/* ── Review Card ─────────────────────────────────────────── */

function ReviewCard({
  review,
  onAction,
}: {
  review: ReviewEntry;
  onAction: (id: string, action: ActionKey) => void;
}) {
  const s = statusStyles[review.status];
  const allActionsTaken = Object.values(ACTION_TAKEN_LABELS);

  return (
    <div className="rounded-2xl bg-white p-6" style={{ border: "1px solid #e5e0d5" }}>
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-base" style={{ color: "#1a1a2e" }}>{review.name}</span>
          <span className="text-sm" style={{ color: "#9ca3af" }}>• {review.id}</span>
          <span
            className="text-xs font-medium px-2.5 py-0.5 rounded-full"
            style={{ backgroundColor: s.bg, color: s.color }}
          >
            {review.status}
          </span>
        </div>
        <div className="flex items-center gap-1 text-sm font-medium" style={{ color: "#6b7280" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="7" width="18" height="13" rx="2" stroke="#9ca3af" strokeWidth="2"/>
            <path d="M3 11h18" stroke="#9ca3af" strokeWidth="2"/>
            <path d="M8 7V5M16 7V5" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {review.tickets} tickets
        </div>
      </div>

      {/* Stars + meta */}
      <div className="flex items-center gap-2 mb-3">
        <StarRating count={review.stars} />
        <span className="text-sm" style={{ color: "#9ca3af" }}>
          {review.date} • {review.location}
        </span>
      </div>

      {/* Review text */}
      <p className="text-sm mb-4" style={{ color: "#374151" }}>{review.text}</p>

      {/* Referred by */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-3"
        style={{ backgroundColor: "#f0faf8", color: "#374151" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="#3DBFA6" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="7" r="4" stroke="#3DBFA6" strokeWidth="2"/>
        </svg>
        <span>
          <span style={{ color: "#6b7280" }}>Referred by: </span>
          <span className="font-medium">{review.referredBy}</span>
          {review.referredRole && (
            <span style={{ color: "#6b7280" }}> ({review.referredRole})</span>
          )}
        </span>
      </div>

      {/* Actions already taken */}
      {review.actionsTaken.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {review.actionsTaken.map((action) => (
            <span
              key={action}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ backgroundColor: "#f0faf8", color: "#2ea890", border: "1px solid #c5ede7" }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <polyline points="20 6 9 17 4 12" stroke="#3DBFA6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {action}
            </span>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        {(
          [
            {
              key: "clientFlag" as ActionKey,
              icon: <FlagIcon />,
              takenLabel: ACTION_TAKEN_LABELS.clientFlag,
            },
            {
              key: "resourceFlag" as ActionKey,
              icon: <InfoIcon />,
              takenLabel: ACTION_TAKEN_LABELS.resourceFlag,
            },
            {
              key: "shareSocial" as ActionKey,
              icon: <ShareIcon />,
              takenLabel: ACTION_TAKEN_LABELS.shareSocial,
            },
            {
              key: "followUp" as ActionKey,
              icon: <FollowUpIcon />,
              takenLabel: ACTION_TAKEN_LABELS.followUp,
            },
          ]
        ).map(({ key, icon, takenLabel }) => {
          const done = review.actionsTaken.includes(takenLabel);
          const isFollowUp = key === "followUp";
          return (
            <button
              key={key}
              onClick={() => !done && onAction(review.id, key)}
              disabled={done}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: done
                  ? "#f3f4f6"
                  : isFollowUp
                  ? "#e8f7f4"
                  : "#f9fafb",
                color: done
                  ? "#9ca3af"
                  : isFollowUp
                  ? "#2ea890"
                  : "#374151",
                border: `1px solid ${done ? "#e5e7eb" : isFollowUp ? "#c5ede7" : "#e5e0d5"}`,
                cursor: done ? "default" : "pointer",
                opacity: done ? 0.6 : 1,
              }}
            >
              <span style={{ color: done ? "#9ca3af" : isFollowUp ? "#3DBFA6" : "#6b7280" }}>
                {icon}
              </span>
              {ACTION_LABELS[key]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Star Rating ─────────────────────────────────────────── */

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24">
          <path
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            fill={i < count ? "#F5A623" : "#e5e0d5"}
          />
        </svg>
      ))}
    </div>
  );
}

/* ── Button Icons ────────────────────────────────────────── */

function FlagIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2"/>
      <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
      <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function FollowUpIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <polyline points="9 18 15 12 9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
