"use client";

import type { Review } from "@/lib/reviews";

interface ReviewListProps {
  reviews: Review[];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < rating ? "#F5A623" : "#EDE2C4", fontSize: 13 }}>★</span>
      ))}
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function ReviewList({ reviews }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-[13px]" style={{ color: "#9AAAB8" }}>
        No reviews yet for this location.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-2xl bg-white p-4"
          style={{ border: "1px solid rgba(210,195,165,0.45)", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <StarRating rating={review.rating} />
              {!review.informationAccurate && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: "#FEF3C7", color: "#92400E" }}>
                  Info may be outdated
                </span>
              )}
            </div>
            <span className="text-[11px]" style={{ color: "#9AAAB8" }}>{timeAgo(review.createdAt)}</span>
          </div>

          {review.text && (
            <p className="text-[13px] leading-relaxed mb-2" style={{ color: "#4A5E6D" }}>{review.text}</p>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            {review.waitTimeMinutes != null && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: "#8A9AAA" }}>
                <span>⏱</span> {review.waitTimeMinutes}m wait
              </span>
            )}
            {!review.attended && review.didNotAttendReason && (
              <span className="text-[11px]" style={{ color: "#F59E0B" }}>
                Did not attend: {review.didNotAttendReason}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
