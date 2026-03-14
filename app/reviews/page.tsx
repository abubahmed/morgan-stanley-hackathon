"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status    = "Completed" | "Flagged" | "Pending";
type ActionKey = "clientFlag" | "resourceFlag" | "shareSocial" | "followUp";
type ActiveTab = "reviews" | "add";

interface Photo { src: string; alt: string; }
interface Moderation { reviewer: string; date: string; inaccurate?: boolean; inaccurateNote?: string; }

interface ReviewEntry {
  id: string; name: string; status: Status; tickets: number; stars: number;
  date: string; location: string; text: string; referredBy: string; referredRole: string;
  photos?: Photo[]; photoStatus?: "Approved" | "Pending Review";
  moderation?: Moderation; actionsTaken: string[];
}

interface ReviewStats { total: number; avgRating: number; totalTickets: number; pendingCount: number; }

interface ResourceOption { id: string; name: string; }

const ACTION_LABELS: Record<ActionKey, string> = {
  clientFlag: "Client Flag Created", resourceFlag: "Resource Flag Created",
  shareSocial: "Shared to Social",   followUp: "Follow-up Sent",
};

const statusStyles: Record<Status, { bg: string; color: string }> = {
  Completed: { bg: "#d1fae5", color: "#065f46" },
  Flagged:   { bg: "#fee2e2", color: "#b91c1c" },
  Pending:   { bg: "#fef3c7", color: "#92400e" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReviewsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("reviews");
  const [filter,   setFilter]    = useState<"All" | Status>("All");
  const [search,   setSearch]    = useState("");
  const [reviews,  setReviews]   = useState<ReviewEntry[]>([]);
  const [stats,    setStats]     = useState<ReviewStats>({ total: 0, avgRating: 0, totalTickets: 0, pendingCount: 0 });
  const [loading,  setLoading]   = useState(true);
  const [error,    setError]     = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const params = new URLSearchParams();
      if (filter !== "All") params.set("status", filter);
      if (search)           params.set("search", search);
      const res = await fetch(`/api/reviews?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReviews(data.reviews);
      setStats(data.stats);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }, [filter, search]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleAction = async (reviewId: string, action: ActionKey) => {
    const label = ACTION_LABELS[action];
    setReviews(prev => prev.map(r =>
      r.id !== reviewId || r.actionsTaken.includes(label) ? r : { ...r, actionsTaken: [...r.actionsTaken, label] }
    ));
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) { fetchReviews(); return; }
      const { review } = await res.json();
      setReviews(prev => prev.map(r => r.id === reviewId ? review : r));
    } catch { fetchReviews(); }
  };

  return (
    <main style={{ backgroundColor: "#FAF7F0" }} className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4"
            style={{ backgroundColor: "#e8f7f4", color: "#2ea890", border: "1px solid #c5ede7" }}>
            <svg width="12" height="12" viewBox="0 0 24 24">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#3DBFA6"/>
            </svg>
            Client Feedback
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#1a1a2e" }}>Client Reviews</h1>
          <p className="text-base" style={{ color: "#6b7280" }}>
            Manage client feedback, track volunteer referrals, and take action on service quality.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 rounded-xl" style={{ background: "#ede8df", width: "fit-content" }}>
          {([
            { key: "reviews" as ActiveTab, label: "Reviews",    icon: "☰" },
            { key: "add"     as ActiveTab, label: "Add Review", icon: "+" },
          ]).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: activeTab === tab.key ? "white" : "transparent",
                color:      activeTab === tab.key ? "#1a1a2e" : "#6b7280",
                boxShadow:  activeTab === tab.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}>
              <span>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        {/* ── Reviews tab ──────────────────────────────────────────────────── */}
        {activeTab === "reviews" && (
          <>
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { value: stats.total.toString(),       label: "Total Reviews" },
                { value: stats.avgRating.toFixed(1),   label: "Average Rating", suffix: "⭐" },
                { value: stats.totalTickets.toString(), label: "Raffle Tickets", suffix: "🎟" },
                { value: stats.pendingCount.toString(), label: "Pending Action" },
              ].map(stat => (
                <div key={stat.label} className="rounded-2xl p-5 bg-white" style={{ border: "1px solid #e5e0d5" }}>
                  <p className="text-3xl font-bold mb-1" style={{ color: "#1a1a2e" }}>
                    {stat.value}{stat.suffix && <span className="text-xl ml-1">{stat.suffix}</span>}
                  </p>
                  <p className="text-sm" style={{ color: "#6b7280" }}>{stat.label}</p>
                </div>
              ))}
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl text-sm" style={{ background: "#fee2e2", color: "#b91c1c" }}>
                Failed to load: {error} — <button onClick={fetchReviews} style={{ textDecoration: "underline", cursor: "pointer" }}>retry</button>
              </div>
            )}

            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <input type="text" placeholder="Search by name, location, or referral..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
                  style={{ background: "white", border: "1px solid #e5e0d5", color: "#374151", outline: "none" }} />
                <svg className="absolute left-3 top-3" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="8" stroke="#9ca3af" strokeWidth="2"/>
                  <path d="m21 21-4.35-4.35" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="flex gap-2">
                {(["All","Completed","Flagged","Pending"] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className="px-4 py-2 rounded-xl text-sm font-medium"
                    style={{ background: filter===f?"#1a1a2e":"white", color: filter===f?"white":"#6b7280", border:"1px solid "+(filter===f?"#1a1a2e":"#e5e0d5") }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {loading && <div className="text-center py-16" style={{ color: "#9ca3af" }}>Loading reviews...</div>}

            {!loading && reviews.length === 0 && (
              <div className="text-center py-16 rounded-2xl bg-white" style={{ border: "1px solid #e5e0d5" }}>
                <p className="text-lg font-medium mb-1" style={{ color: "#1a1a2e" }}>No reviews found</p>
                <p className="text-sm mb-4" style={{ color: "#9ca3af" }}>
                  {search ? "Try a different search term" : "No reviews match the current filter"}
                </p>
                <button onClick={() => setActiveTab("add")}
                  className="px-5 py-2 rounded-xl text-sm font-medium"
                  style={{ background: "#1a1a2e", color: "white" }}>
                  + Add the first review
                </button>
              </div>
            )}

            {!loading && reviews.map(review => (
              <ReviewCard key={review.id} review={review} onAction={handleAction} />
            ))}
          </>
        )}

        {/* ── Add Review tab ───────────────────────────────────────────────── */}
        {activeTab === "add" && (
          <AddReviewForm
            onSubmitted={() => { setActiveTab("reviews"); fetchReviews(); }}
          />
        )}
      </div>
    </main>
  );
}

// ─── Add Review Form  ─────────────────────────────────────────────────────────
// Fields match the Google Form "Resource Visit Review" exactly.

function AddReviewForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [submitting,    setSubmitting]    = useState(false);
  const [submitted,     setSubmitted]     = useState(false);
  const [ticketsEarned, setTicketsEarned] = useState(0);
  const [matchedName,   setMatchedName]   = useState("");
  const [errors,        setErrors]        = useState<Record<string, string>>({});

  // Form state — field names match the Google Form labels
  const [name,                  setName]                  = useState("");
  const [phoneNumber,           setPhoneNumber]           = useState("");
  const [resourceId,     setResourceId]     = useState("");
  const [resourceSearch, setResourceSearch] = useState("");
  const [showDropdown,   setShowDropdown]   = useState(false);
  const [visitDate,             setVisitDate]             = useState("");
  const [attended,              setAttended]              = useState<"yes"|"no"|null>(null);
  const [didNotAttendReason,    setDidNotAttendReason]    = useState("");
  const [rating,                setRating]                = useState<number|null>(null);
  const [waitTimeMinutes,       setWaitTimeMinutes]       = useState("");
  const [informationAccuracy,   setInformationAccuracy]   = useState<number|null>(null);
  const [text,                  setText]                  = useState("");
  const [photoPublic,           setPhotoPublic]           = useState<"yes"|"no"|null>(null);
  const [shareTextWithResource, setShareTextWithResource] = useState<"yes"|"no"|null>(null);

  const [resources, setResources] = useState<ResourceOption[]>([]);
  const selectingRef = useRef(false); 

useEffect(() => {
  fetch("/api/resources?limit=500")
    .then(r => r.json())
    .then(data =>
      setResources(
        (data.resources ?? [])
          .filter((r: ResourceOption) => r.name)
          .sort((a: ResourceOption, b: ResourceOption) =>
            a.name.localeCompare(b.name)
          )
      )
    )
    .catch(() => {});
}, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim())         e.name         = "Name is required.";
    if (!phoneNumber.trim())  e.phoneNumber  = "Phone number is required.";
    if (!resourceId)     e.resourceId  = "Please select a resource."; 
    if (!attended)            e.attended     = "Please indicate if you received assistance.";
    if (attended === "no" && !didNotAttendReason)
                              e.reason       = "Please select a reason.";
    if (!rating)              e.rating       = "Please rate your experience.";
    if (!shareTextWithResource)
                              e.share        = "Please select a sharing preference.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, phoneNumber, resourceId, visitDate,
          attended, didNotAttendReason: attended === "no" ? didNotAttendReason : null,
          rating, waitTimeMinutes: waitTimeMinutes || null,
          informationAccuracy, text: text.trim() || null,
          photoPublic, shareTextWithResource,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors({ submit: data.error ?? `Error ${res.status}` });
        return;
      }
      setTicketsEarned(data.tickets ?? 0);
      setMatchedName(data.resourceName ?? resourceId);
      setSubmitted(true);
    } catch {
      setErrors({ submit: "Network error — please try again." });
    } finally { setSubmitting(false); }
  }

  function resetForm() {
    setName(""); setPhoneNumber(""); setResourceId(""); setResourceSearch("");setVisitDate("");
    setAttended(null); setDidNotAttendReason(""); setRating(null);
    setWaitTimeMinutes(""); setInformationAccuracy(null); setText("");
    setPhotoPublic(null); setShareTextWithResource(null);
    setErrors({}); setSubmitted(false);
  }

  // ── Success ──────────────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: "#e8f7f4" }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <polyline points="20 6 9 17 4 12" stroke="#3DBFA6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "#1a1a2e" }}>Review submitted!</h2>
        <p className="text-base mb-1" style={{ color: "#6b7280" }}>
          Thank you for reviewing <span className="font-medium" style={{ color: "#374151" }}>{matchedName}</span>.
        </p>
        <p className="text-sm mb-6" style={{ color: "#6b7280" }}>
          Your feedback helps improve food access for everyone in the community.
        </p>
        {ticketsEarned > 0 && (
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-6"
            style={{ background: "#fef3c7", color: "#92400e" }}>
            <span className="text-xl">🎟</span>
            <span className="font-semibold text-sm">
              You earned {ticketsEarned} raffle ticket{ticketsEarned !== 1 ? "s" : ""}!
            </span>
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <button onClick={resetForm}
            className="px-5 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: "white", color: "#374151", border: "1px solid #e5e0d5" }}>
            Submit another
          </button>
          <button onClick={onSubmitted}
            className="px-5 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: "#1a1a2e", color: "white" }}>
            View all reviews
          </button>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────

  const ticketPreview = rating ? (rating >= 5 ? 5 : rating >= 4 ? 4 : rating >= 3 ? 3 : 2) : null;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e0d5" }}>

        {/* Form header — matches Google Form style */}
        <div className="p-8 pb-6" style={{ borderTop: "8px solid #3DBFA6", background: "white" }}>
          <h2 className="text-2xl font-bold mb-1" style={{ color: "#1a1a2e" }}>Resource Visit Review</h2>
          <p className="text-sm" style={{ color: "#6b7280" }}>
            Share your experience at a food pantry or assistance resource to help improve services and verify information for others.
          </p>
          {errors.submit && (
            <div className="mt-4 p-3 rounded-xl text-sm" style={{ background: "#fee2e2", color: "#b91c1c" }}>
              {errors.submit}
            </div>
          )}
        </div>

        <div className="px-8 py-6 bg-white" style={{ borderTop: "1px solid #f0ece3" }}>

          {/* 1. Name */}
          <Field label="Name" required error={errors.name}>
            <input type="text" placeholder="Your full name"
              value={name} onChange={e => setName(e.target.value)}
              style={inputStyle(!!errors.name)} />
          </Field>

          {/* 2. Phone Number */}
          <Field label="Phone Number (only numbers)" required error={errors.phoneNumber}>
            <input type="tel" placeholder="e.g. 2125550100"
              value={phoneNumber} onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
              style={inputStyle(!!errors.phoneNumber)} />
          </Field>

          {/* 3. Which resource or organization did you visit? */}
          <Field label="Which resource or organization did you visit?" required error={errors.resourceId}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search for a food pantry..."
                value={resourceSearch}
                onChange={e => {
                  setResourceSearch(e.target.value);
                  setResourceId("");
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => {
                  // Only close if we're not in the middle of selecting
                  if (!selectingRef.current) {
                    setShowDropdown(false);
                  }
                }}
                style={inputStyle(!!errors.resourceId)}
                autoComplete="off"
              />

              {/* Checkmark when selected */}
              {resourceId && (
                <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <polyline points="20 6 9 17 4 12" stroke="#3DBFA6" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}

              {/* Dropdown */}
              {showDropdown && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                  background: "white", border: "1px solid #e5e0d5",
                  borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                  zIndex: 50, maxHeight: 240, overflowY: "auto",
                }}>
                  {resources.length === 0 && (
                    <div style={{ padding: "12px 14px", fontSize: 13, color: "#9ca3af" }}>
                      Loading resources...
                    </div>
                  )}

                  {resources.length > 0 && (() => {
                    const filtered = resourceSearch.length >= 1
                      ? resources.filter(r => r.name.toLowerCase().includes(resourceSearch.toLowerCase())).slice(0, 20)
                      : resources.slice(0, 20); // show first 20 on focus before typing

                    if (filtered.length === 0) {
                      return (
                        <div style={{ padding: "12px 14px", fontSize: 13, color: "#9ca3af" }}>
                          No resources found for "{resourceSearch}"
                        </div>
                      );
                    }

                    return filtered.map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onMouseDown={() => { selectingRef.current = true; }}
                        onMouseUp={() => {
                          selectingRef.current = false;
                          setResourceId(r.id);
                          setResourceSearch(r.name);
                          setShowDropdown(false);
                        }}
                        style={{
                          display: "block", width: "100%", textAlign: "left",
                          padding: "10px 14px", fontSize: 13, cursor: "pointer",
                          color:      resourceId === r.id ? "#2ea890" : "#374151",
                          background: resourceId === r.id ? "#e8f7f4" : "transparent",
                          border: "none", borderBottom: "1px solid #f5f0e8",
                        }}
                      >
                        {r.name}
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>
          </Field>

          {/* 4. When did you visit? */}
          <Field label="When did you visit this resource?">
            <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)}
              style={inputStyle(false)} />
          </Field>

          {/* 5. Attended */}
          <Field
            label="Did you successfully receive the assistance (e.g., food, supplies, counseling) you were seeking during this visit?"
            required error={errors.attended}>
            <div className="flex flex-col gap-2">
              {([
                { v: "yes" as const, l: "Yes, I received assistance" },
                { v: "no"  as const, l: "No, I did not receive assistance" },
              ]).map(opt => (
                <label key={opt.v}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all"
                  style={{
                    border:     "1px solid " + (attended === opt.v ? "#3DBFA6" : "#e5e0d5"),
                    background: attended === opt.v ? "#e8f7f4" : "white",
                  }}>
                  <input type="radio" name="attended" value={opt.v}
                    checked={attended === opt.v}
                    onChange={() => { setAttended(opt.v); setDidNotAttendReason(""); }}
                    className="accent-teal-500" />
                  <span className="text-sm" style={{ color: attended === opt.v ? "#2ea890" : "#374151" }}>{opt.l}</span>
                </label>
              ))}
            </div>
          </Field>

          {/* 6. If did NOT attend — reason */}
          {attended === "no" && (
            <Field label="If you did NOT receive assistance, please select the primary reason why:" required error={errors.reason}>
              <div className="flex flex-col gap-2">
                {[
                  "Location was closed/Hours were incorrect",
                  "Arrived too late/Missed cutoff time",
                  "Resource was out of items/Capacity reached",
                  "Did not meet eligibility requirements",
                  "Location was too far or difficult to reach",
                  "Other (Please specify in comments)",
                ].map((reason, i) => (
                  <label key={reason}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all"
                    style={{
                      border:     "1px solid " + (didNotAttendReason === reason ? "#3DBFA6" : "#e5e0d5"),
                      background: didNotAttendReason === reason ? "#e8f7f4" : "white",
                    }}>
                    <input type="radio" name="reason" value={reason}
                      checked={didNotAttendReason === reason}
                      onChange={() => setDidNotAttendReason(reason)}
                      className="accent-teal-500" />
                    <span className="text-sm" style={{ color: didNotAttendReason === reason ? "#2ea890" : "#374151" }}>
                      {i + 1}. {reason}
                    </span>
                  </label>
                ))}
              </div>
            </Field>
          )}

          {/* 7. Star rating */}
          <Field label="Rate your overall experience at this resource:" required error={errors.rating}>
            <div className="flex gap-3 items-center justify-center py-2">
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button" onClick={() => setRating(n)}
                  className="flex flex-col items-center gap-1 transition-all"
                  style={{ cursor: "pointer", background: "none", border: "none" }}>
                  <svg width="36" height="36" viewBox="0 0 24 24">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                      fill={rating !== null && n <= rating ? "#F5A623" : "#e5e0d5"}
                      stroke={rating !== null && n <= rating ? "#F5A623" : "#d1d5db"}
                      strokeWidth="1"/>
                  </svg>
                  <span className="text-xs" style={{ color: "#9ca3af" }}>{n}</span>
                </button>
              ))}
            </div>
          </Field>

          {/* 8. Wait time */}
          <Field label="Approximately how many minutes did you wait in line or before receiving service?"
            hint="Optional — leave blank if not applicable">
            <input type="text" inputMode="numeric" placeholder="e.g. 20"
              value={waitTimeMinutes} onChange={e => setWaitTimeMinutes(e.target.value.replace(/\D/g, ""))}
              style={{ ...inputStyle(false), width: 200 }} />
          </Field>

          {/* 9. Information accuracy 1-5 scale */}
          <Field label="How accurate were the resource details (hours, location, services offered) listed on our platform?">
            <div className="flex items-center gap-2">
              <span className="text-xs w-28 text-right" style={{ color: "#6b7280" }}>Very Inaccurate</span>
              <div className="flex gap-3 flex-1 justify-center">
                {[1,2,3,4,5].map(n => (
                  <label key={n} className="flex flex-col items-center gap-1 cursor-pointer">
                    <span className="text-xs" style={{ color: "#6b7280" }}>{n}</span>
                    <input type="radio" name="accuracy" value={n}
                      checked={informationAccuracy === n}
                      onChange={() => setInformationAccuracy(n)}
                      className="accent-teal-500 w-5 h-5" />
                  </label>
                ))}
              </div>
              <span className="text-xs w-28" style={{ color: "#6b7280" }}>Completely Accurate</span>
            </div>
          </Field>

          {/* 10. Additional comments */}
          <Field label="Would you like to share any additional comments about your visit?"
            hint="Optional">
            <textarea rows={4} placeholder="Long answer text"
              value={text} onChange={e => setText(e.target.value)}
              style={{ ...inputStyle(false), resize: "vertical" as const }} />
          </Field>

          {/* 11. Photo upload — note (actual upload not wired; shows intent) */}
          <Field label="Upload a photo of the food or items you received (Optional)">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ border: "1px dashed #d1d5db", background: "#f9f7f2" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
                <polyline points="17 8 12 3 7 8" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="3" x2="12" y2="15" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span className="text-sm" style={{ color: "#9ca3af" }}>
                Photo upload coming soon — add file via Google Drive
              </span>
            </div>
          </Field>

          {/* 12. Photo public */}
          <Field label="If you uploaded a photo, can it be shown publicly on our website to help other clients?">
            <div className="flex flex-col gap-2">
              {([
                { v: "yes" as const, l: "Yes, approve for public display" },
                { v: "no"  as const, l: "No, keep the photo private (for verification/internal use only)" },
              ]).map(opt => (
                <label key={opt.v}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all"
                  style={{
                    border:     "1px solid " + (photoPublic === opt.v ? "#3DBFA6" : "#e5e0d5"),
                    background: photoPublic === opt.v ? "#e8f7f4" : "white",
                  }}>
                  <input type="radio" name="photoPublic" value={opt.v}
                    checked={photoPublic === opt.v}
                    onChange={() => setPhotoPublic(opt.v)}
                    className="accent-teal-500" />
                  <span className="text-sm" style={{ color: photoPublic === opt.v ? "#2ea890" : "#374151" }}>{opt.l}</span>
                </label>
              ))}
            </div>
          </Field>

          {/* 13. Share text with resource — REQUIRED per form */}
          <Field
            label="May we share your review text (excluding your name or personal details) directly with the resource organization to help them improve?"
            required error={errors.share}>
            <div className="flex flex-col gap-2">
              {([
                { v: "no"  as const, l: "No, keep this feedback private (internal use only)" },
                { v: "yes" as const, l: "Yes, you may share this feedback with the resource" },
              ]).map(opt => (
                <label key={opt.v}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all"
                  style={{
                    border:     "1px solid " + (shareTextWithResource === opt.v ? "#3DBFA6" : "#e5e0d5"),
                    background: shareTextWithResource === opt.v ? "#e8f7f4" : "white",
                  }}>
                  <input type="radio" name="shareText" value={opt.v}
                    checked={shareTextWithResource === opt.v}
                    onChange={() => setShareTextWithResource(opt.v)}
                    className="accent-teal-500" />
                  <span className="text-sm" style={{ color: shareTextWithResource === opt.v ? "#2ea890" : "#374151" }}>{opt.l}</span>
                </label>
              ))}
            </div>
          </Field>

          {/* Raffle preview */}
          {ticketPreview !== null && (
            <div className="flex items-center gap-3 p-4 rounded-xl mb-6"
              style={{ background: "#fef3c7", border: "1px solid #fde68a" }}>
              <span className="text-2xl">🎟</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#92400e" }}>
                  Submit to earn {ticketPreview} raffle ticket{ticketPreview !== 1 ? "s" : ""}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#b45309" }}>
                  Entered into the monthly prize drawing automatically.
                </p>
              </div>
            </div>
          )}

          <button type="submit" disabled={submitting}
            className="w-full py-3.5 rounded-xl text-sm font-semibold"
            style={{ background: submitting ? "#9ca3af" : "#1a1a2e", color: "white", cursor: submitting ? "not-allowed" : "pointer" }}>
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── Form helpers ─────────────────────────────────────────────────────────────

function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
        {label}{required && <span style={{ color: "#e05a4e", marginLeft: 3 }}>*</span>}
      </label>
      {hint && <p className="text-xs mb-2" style={{ color: "#9ca3af" }}>{hint}</p>}
      {children}
      {error && <p className="text-xs mt-1.5" style={{ color: "#e05a4e" }}>{error}</p>}
    </div>
  );
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: "100%", padding: "10px 12px", borderRadius: 10, fontSize: 14,
    outline: "none", border: "1px solid " + (hasError ? "#fca5a5" : "#e5e0d5"),
    background: "white", color: "#374151",
  };
}

// ─── Review Card ──────────────────────────────────────────────────────────────

function ReviewCard({ review, onAction }: { review: ReviewEntry; onAction: (id: string, a: ActionKey) => void }) {
  const ss   = statusStyles[review.status];
  const taken = review.actionsTaken;
  const isDone = (a: ActionKey) => taken.includes(ACTION_LABELS[a]);

  return (
    <div className="bg-white rounded-2xl p-6 mb-4" style={{ border: "1px solid #e5e0d5" }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: "#e8f7f4", color: "#2ea890" }}>{review.name.charAt(0)}</div>
          <div>
            <p className="font-semibold text-sm" style={{ color: "#1a1a2e" }}>{review.name}</p>
            <p className="text-xs" style={{ color: "#9ca3af" }}>{review.date} · {review.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StarRating count={review.stars} />
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: ss.bg, color: ss.color }}>{review.status}</span>
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#fef3c7", color: "#92400e" }}>🎟 {review.tickets}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="#9ca3af" strokeWidth="2"/>
          <circle cx="12" cy="10" r="3" stroke="#9ca3af" strokeWidth="2"/>
        </svg>
        <span className="text-sm font-medium" style={{ color: "#374151" }}>{review.location}</span>
      </div>

      <p className="text-sm mb-4 leading-relaxed" style={{ color: "#374151" }}>{review.text}</p>

      {review.photos && review.photos.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {review.photos.map((photo, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden" style={{ width: 120, height: 90 }}>
              <Image src={photo.src} alt={photo.alt} fill style={{ objectFit: "cover" }} unoptimized />
            </div>
          ))}
          {review.photoStatus && (
            <div className="flex items-center">
              <span className="text-xs px-2 py-1 rounded-full font-medium"
                style={{ background: review.photoStatus==="Approved"?"#d1fae5":"#fef3c7", color: review.photoStatus==="Approved"?"#065f46":"#92400e" }}>
                {review.photoStatus}
              </span>
            </div>
          )}
        </div>
      )}

      {review.moderation && (
        <div className="mb-3 rounded-lg overflow-hidden" style={{ border: "1px solid #e5e0d5" }}>
          <div className="flex items-center gap-2 px-3 py-2.5" style={{ backgroundColor: "#f9f7f2" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <p className="text-sm font-medium" style={{ color: "#374151" }}>Moderation</p>
              <p className="text-xs" style={{ color: "#9ca3af" }}>Reviewed by: Admin - {review.moderation.reviewer} on {review.moderation.date}</p>
            </div>
          </div>
          {review.moderation.inaccurate && (
            <div className="flex items-start gap-2 px-3 py-2.5" style={{ backgroundColor: "#fff5f5", borderTop: "1px solid #fecaca" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mt-0.5 flex-shrink-0">
                <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="2"/>
                <line x1="12" y1="8" x2="12" y2="12" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1" fill="#dc2626"/>
              </svg>
              <div>
                <p className="text-xs font-semibold mb-0.5" style={{ color: "#b91c1c" }}>Marked as Inaccurate</p>
                <p className="text-xs" style={{ color: "#374151" }}>{review.moderation.inaccurateNote}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-3" style={{ backgroundColor: "#f0faf8" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="#3DBFA6" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="7" r="4" stroke="#3DBFA6" strokeWidth="2"/>
        </svg>
        <span>
          <span style={{ color: "#6b7280" }}>Referred by: </span>
          <span className="font-medium" style={{ color: "#374151" }}>{review.referredBy}</span>
          {review.referredRole && <span style={{ color: "#6b7280" }}> ({review.referredRole})</span>}
        </span>
      </div>

      {taken.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {taken.map(action => (
            <span key={action} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ backgroundColor: "#f0faf8", color: "#2ea890", border: "1px solid #c5ede7" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <polyline points="20 6 9 17 4 12" stroke="#3DBFA6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {action}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap pt-1">
        <ActionBtn icon={<ModerateIcon />}  label="Moderate"      done={false}                  color="neutral" />
        <ActionBtn icon={<FlagIcon />}       label="Client Flag"   done={isDone("clientFlag")}   color="red"     onClick={() => onAction(review.id, "clientFlag")} />
        <ActionBtn icon={<InfoIcon />}       label="Resource Flag" done={isDone("resourceFlag")} color="orange"  onClick={() => onAction(review.id, "resourceFlag")} />
        <ActionBtn icon={<ShareIcon />}      label="Share Social"  done={isDone("shareSocial")}  color="neutral" onClick={() => onAction(review.id, "shareSocial")} />
        <ActionBtn icon={<FollowUpIcon />}   label="Follow-up"     done={isDone("followUp")}     color="teal"    onClick={() => onAction(review.id, "followUp")} />
      </div>
    </div>
  );
}

// ─── Micro components ─────────────────────────────────────────────────────────

const colorMap = {
  red:     { active:{bg:"#fff1f1",color:"#dc2626",border:"#fecaca"}, done:{bg:"#f3f4f6",color:"#9ca3af",border:"#e5e7eb"} },
  orange:  { active:{bg:"#fff7ed",color:"#c2410c",border:"#fed7aa"}, done:{bg:"#f3f4f6",color:"#9ca3af",border:"#e5e7eb"} },
  teal:    { active:{bg:"#e8f7f4",color:"#2ea890",border:"#c5ede7"}, done:{bg:"#f3f4f6",color:"#9ca3af",border:"#e5e7eb"} },
  neutral: { active:{bg:"#f9fafb",color:"#374151",border:"#e5e0d5"}, done:{bg:"#f3f4f6",color:"#9ca3af",border:"#e5e7eb"} },
};

function ActionBtn({ icon, label, done, color, onClick }:
  { icon: React.ReactNode; label: string; done: boolean; color: keyof typeof colorMap; onClick?: () => void }) {
  const c = done ? colorMap[color].done : colorMap[color].active;
  return (
    <button onClick={!done ? onClick : undefined} disabled={done}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
      style={{ backgroundColor: c.bg, color: c.color, border:`1px solid ${c.border}`, cursor:done?"default":"pointer", opacity:done?0.55:1 }}>
      <span style={{ color: c.color }}>{icon}</span>{label}
    </button>
  );
}

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill={i<count?"#F5A623":"#e5e0d5"}/>
        </svg>
      ))}
    </div>
  );
}

function ModerateIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function FlagIcon()     { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>; }
function InfoIcon()     { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>; }
function ShareIcon()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2"/><circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2"/><circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>; }
function FollowUpIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><polyline points="9 18 15 12 9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }