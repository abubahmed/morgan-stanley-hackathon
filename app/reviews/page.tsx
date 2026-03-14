"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";

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
  { id: "REV-001", name: "Maria Rodriguez", status: "Completed", tickets: 5, stars: 5, date: "2026-03-14", location: "Main Street Food Bank", text: "The food pantry was well-stocked and the volunteers were incredibly kind. They helped me find culturally appropriate foods for my family.", referredBy: "Sarah Chen", referredRole: "Volunteer", actionsTaken: ["Shared to Social", "Follow-up Sent"] },
  { id: "REV-002", name: "James Wilson", status: "Flagged", tickets: 3, stars: 2, date: "2026-03-13", location: "Riverside Community Center", text: "Good service but they ran out of fresh produce by the time I arrived. Would appreciate if they could stock more vegetables.", referredBy: "Michael Brown", referredRole: "Outreach", actionsTaken: ["Resource Flag Created"] },
  { id: "REV-003", name: "Lisa Thompson", status: "Pending", tickets: 4, stars: 4, date: "2026-03-12", location: "Oak Park Distribution", text: "Great experience overall. The wait time was a bit long but the staff made it worth it with their warmth and care.", referredBy: "Direct Visit", referredRole: "", actionsTaken: [] },
  { id: "REV-004", name: "Robert Martinez", status: "Flagged", tickets: 2, stars: 2, date: "2026-03-11", location: "Main Street Food Bank", text: "I appreciate the help but I have specific dietary needs that weren't accommodated. I need diabetic-friendly options.", referredBy: "Emily Davis", referredRole: "Healthcare", actionsTaken: ["Client Flag Created", "Resource Flag Created", "Follow-up Sent"] },
  { id: "REV-005", name: "Patricia Johnson", status: "Completed", tickets: 5, stars: 5, date: "2026-03-10", location: "Westside Pantry", text: "Wonderful service! Found everything I needed and the volunteers even helped me carry groceries to my car. So grateful for this resource.", referredBy: "Jessica Lee", referredRole: "Community", actionsTaken: [] },
  { id: "REV-006", name: "David Kim", status: "Pending", tickets: 3, stars: 3, date: "2026-03-09", location: "Eastside Pantry", text: "Decent selection but arrived late and they were low on most items. Hope to go earlier next time.", referredBy: "Outreach Team", referredRole: "Staff", actionsTaken: [] },
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
        if (r.id !== reviewId || r.actionsTaken.includes(label)) return r;
        return { ...r, actionsTaken: [...r.actionsTaken, label] };
      })
    );
  };

  const filtered = reviews.filter((r) => {
    const matchesFilter = filter === "All" || r.status === filter;
    const q = search.toLowerCase();
    const matchesSearch = !q || r.name.toLowerCase().includes(q) || r.location.toLowerCase().includes(q) || r.referredBy.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const avgRating = (reviews.reduce((s, r) => s + r.stars, 0) / reviews.length).toFixed(1);
  const totalTickets = reviews.reduce((s, r) => s + r.tickets, 0);
  const pendingCount = reviews.filter((r) => r.status === "Pending").length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5EDD8" }}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#1E2D3D" }}>Client Reviews</h1>
          <p className="text-[13px]" style={{ color: "#8A9AAA" }}>
            Manage feedback, track volunteer referrals, and take action on service quality.
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { value: reviews.length.toString(), label: "Total Reviews" },
            { value: avgRating, label: "Avg Rating", suffix: "★" },
            { value: totalTickets.toString(), label: "Raffle Tickets" },
            { value: pendingCount.toString(), label: "Pending" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl p-4 bg-white"
              style={{ border: "1px solid rgba(210,195,165,0.45)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
              <p className="text-2xl font-bold mb-0.5" style={{ color: "#1E2D3D" }}>
                {stat.value}{stat.suffix && <span className="text-base ml-1" style={{ color: "#3DBFAC" }}>{stat.suffix}</span>}
              </p>
              <p className="text-[11px]" style={{ color: "#8A9AAA" }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white"
            style={{ border: "1px solid rgba(210,195,165,0.45)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="#9ca3af" strokeWidth="2"/>
              <path d="M21 21L16.65 16.65" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, location, or referrer..."
              className="flex-1 bg-transparent outline-none text-[13px]" style={{ color: "#1E2D3D" }} />
          </div>
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid rgba(210,195,165,0.45)" }}>
            {(["All", "Pending", "Flagged", "Completed"] as const).map((f, i, arr) => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-4 py-2 text-[12px] font-medium transition-colors"
                style={{
                  backgroundColor: filter === f ? "#3DBFAC" : "white",
                  color: filter === f ? "white" : "#4A5E6D",
                  borderRight: i < arr.length - 1 ? "1px solid rgba(210,195,165,0.45)" : "none",
                }}>
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
            <div className="text-center py-16 text-[13px]" style={{ color: "#9AAAB8" }}>No reviews match your filter.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewCard({ review, onAction }: { review: ReviewEntry; onAction: (id: string, action: ActionKey) => void }) {
  const s = statusStyles[review.status];
  return (
    <div className="rounded-2xl bg-white p-5" style={{ border: "1px solid rgba(210,195,165,0.45)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-[14px]" style={{ color: "#1E2D3D" }}>{review.name}</span>
          <span className="text-[12px]" style={{ color: "#9AAAB8" }}>· {review.id}</span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: s.bg, color: s.color }}>{review.status}</span>
        </div>
        <span className="text-[12px]" style={{ color: "#8A9AAA" }}>{review.tickets} tickets</span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} style={{ color: i < review.stars ? "#F5A623" : "#EDE2C4", fontSize: 13 }}>★</span>
          ))}
        </div>
        <span className="text-[11px]" style={{ color: "#9AAAB8" }}>{review.date} · {review.location}</span>
      </div>

      <p className="text-[13px] mb-3 leading-relaxed" style={{ color: "#4A5E6D" }}>{review.text}</p>

      {review.referredBy && review.referredBy !== "Direct Visit" && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] mb-3 w-fit"
          style={{ background: "rgba(61,191,172,0.08)", border: "1px solid rgba(61,191,172,0.15)" }}>
          <span style={{ color: "#8A9AAA" }}>Referred by</span>
          <span className="font-medium" style={{ color: "#1E2D3D" }}>{review.referredBy}</span>
          {review.referredRole && <span style={{ color: "#8A9AAA" }}>({review.referredRole})</span>}
        </div>
      )}

      {review.actionsTaken.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {review.actionsTaken.map((action) => (
            <span key={action} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: "rgba(61,191,172,0.08)", color: "#27A090", border: "1px solid rgba(61,191,172,0.2)" }}>
              ✓ {action}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {(["clientFlag", "resourceFlag", "shareSocial", "followUp"] as ActionKey[]).map((key) => {
          const done = review.actionsTaken.includes(ACTION_TAKEN_LABELS[key]);
          const isFollowUp = key === "followUp";
          return (
            <button key={key} onClick={() => !done && onAction(review.id, key)} disabled={done}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
              style={{
                backgroundColor: done ? "#F5F5F5" : isFollowUp ? "rgba(61,191,172,0.08)" : "white",
                color: done ? "#9AAAB8" : isFollowUp ? "#27A090" : "#4A5E6D",
                border: `1px solid ${done ? "#EEE" : isFollowUp ? "rgba(61,191,172,0.25)" : "rgba(210,195,165,0.45)"}`,
                cursor: done ? "default" : "pointer",
                opacity: done ? 0.7 : 1,
              }}>
              {ACTION_LABELS[key]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
