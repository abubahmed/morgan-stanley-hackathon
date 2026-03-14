"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import ReviewList from "@/components/resources/ReviewList";
import type { Resource } from "@/types/resource";
import type { Review } from "@/lib/reviews";
import { ArrowLeft, Clock, Star, CheckCircle, Globe, Phone, MapPin, Tag } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  FOOD_PANTRY: "Food Pantry",
  SOUP_KITCHEN: "Soup Kitchen",
  SNAP_EBT: "SNAP / EBT",
};

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  FOOD_PANTRY: { bg: "rgba(61,191,172,0.10)", color: "#27A090" },
  SOUP_KITCHEN: { bg: "rgba(245,166,35,0.10)", color: "#B86010" },
  SNAP_EBT: { bg: "rgba(99,102,241,0.10)", color: "#4338CA" },
};

export default function ResourceDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [resource, setResource] = useState<Resource | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      try {
        const [resRes, revRes] = await Promise.all([
          fetch(`/api/resources/${id}`),
          fetch(`/api/reviews?resourceId=${id}&count=8`),
        ]);
        if (!resRes.ok) throw new Error("Resource not found");
        const { resource: r } = await resRes.json() as { resource: Resource };
        const { reviews: rv } = await revRes.json() as { reviews: Review[] };
        setResource(r);
        setReviews(rv ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load resource");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F5EDD8" }}>
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 animate-spin"
            style={{ borderColor: "#3DBFAC", borderTopColor: "transparent" }} />
        </div>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F5EDD8" }}>
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-center p-8">
          <div>
            <p className="text-[14px] mb-4" style={{ color: "#4A5E6D" }}>{error ?? "Resource not found"}</p>
            <Link href="/resources" className="text-[13px] font-semibold" style={{ color: "#3DBFAC" }}>
              Back to Resources
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const typeColor = TYPE_COLORS[resource.resourceType?.id] ?? { bg: "#F5EDD8", color: "#4A5E6D" };
  const address = [resource.addressStreet1, resource.city, resource.state, resource.zipCode]
    .filter(Boolean).join(", ");
  const avgWait = resource.waitTimeMinutesAverage;
  const avgRating = resource.ratingAverage;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5EDD8" }}>
      <Navbar />

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Back */}
        <Link href="/resources" className="flex items-center gap-1.5 text-[13px] mb-6 w-fit"
          style={{ color: "#8A9AAA" }}>
          <ArrowLeft size={13} />
          Back to Resources
        </Link>

        {/* Main card */}
        <div className="rounded-2xl bg-white p-6 mb-4"
          style={{ border: "1px solid rgba(210,195,165,0.45)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
          {/* Type badge + title */}
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-1">
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full mb-2 inline-block"
                style={{ backgroundColor: typeColor.bg, color: typeColor.color }}>
                {TYPE_LABELS[resource.resourceType?.id] ?? resource.resourceType?.name}
              </span>
              <h1 className="text-xl font-bold leading-tight" style={{ color: "#1E2D3D" }}>{resource.name}</h1>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            {avgRating > 0 && (
              <div className="flex items-center gap-1">
                <Star size={13} style={{ color: "#F5A623" }} fill="#F5A623" />
                <span className="text-[13px] font-semibold" style={{ color: "#1E2D3D" }}>{avgRating.toFixed(1)}</span>
                <span className="text-[12px]" style={{ color: "#9AAAB8" }}>({resource._count?.reviews ?? 0} reviews)</span>
              </div>
            )}
            {avgWait > 0 && (
              <div className="flex items-center gap-1">
                <Clock size={13} style={{ color: "#8A9AAA" }} />
                <span className="text-[12px]" style={{ color: "#8A9AAA" }}>{avgWait}m avg wait</span>
              </div>
            )}
            {resource.acceptingNewClients && (
              <div className="flex items-center gap-1">
                <CheckCircle size={13} style={{ color: "#3DBFAC" }} />
                <span className="text-[12px]" style={{ color: "#3DBFAC" }}>Accepting clients</span>
              </div>
            )}
            {resource.openByAppointment && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: "rgba(99,102,241,0.10)", color: "#4338CA" }}>
                By appointment
              </span>
            )}
          </div>

          {/* Description */}
          {resource.description && (
            <p className="text-[13px] leading-relaxed mb-4" style={{ color: "#4A5E6D" }}>
              {resource.description}
            </p>
          )}

          {/* Contact info */}
          <div className="space-y-2">
            {address && (
              <div className="flex items-start gap-2">
                <MapPin size={13} className="mt-0.5 shrink-0" style={{ color: "#9AAAB8" }} />
                <span className="text-[13px]" style={{ color: "#4A5E6D" }}>{address}</span>
              </div>
            )}
            {resource.contacts?.filter(c => c.public).map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <Phone size={13} style={{ color: "#9AAAB8" }} />
                <span className="text-[13px]" style={{ color: "#4A5E6D" }}>{c.phone}</span>
              </div>
            ))}
            {resource.website && (
              <div className="flex items-center gap-2">
                <Globe size={13} style={{ color: "#9AAAB8" }} />
                <a href={resource.website} target="_blank" rel="noopener noreferrer"
                  className="text-[13px]" style={{ color: "#3DBFAC" }}>
                  {resource.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {resource.tags?.length > 0 && (
          <div className="rounded-2xl bg-white p-5 mb-4"
            style={{ border: "1px solid rgba(210,195,165,0.45)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center gap-1.5 mb-3">
              <Tag size={13} style={{ color: "#8A9AAA" }} />
              <p className="text-[13px] font-semibold" style={{ color: "#1E2D3D" }}>Services & Tags</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {resource.tags.map((tag) => (
                <span key={tag.id} className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                  style={{ background: "#F5EDD8", border: "1px solid rgba(210,195,165,0.6)", color: "#4A5E6D" }}>
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Images */}
        {resource.images?.length > 0 && (
          <div className="rounded-2xl overflow-hidden mb-4" style={{ border: "1px solid rgba(210,195,165,0.45)" }}>
            <div className="flex gap-1 overflow-x-auto p-2">
              {resource.images.slice(0, 4).map((img, i) => (
                <img key={i} src={img.url} alt={resource.name} className="h-36 w-auto rounded-xl object-cover shrink-0" />
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="rounded-2xl bg-white p-5"
          style={{ border: "1px solid rgba(210,195,165,0.45)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
          <p className="text-[14px] font-semibold mb-4" style={{ color: "#1E2D3D" }}>
            Community Reviews
          </p>
          <ReviewList reviews={reviews} />
        </div>
      </div>
    </div>
  );
}
