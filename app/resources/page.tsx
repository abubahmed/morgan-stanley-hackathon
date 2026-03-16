"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import type { Resource } from "@/types/resource";
import { Search, Clock, Star, CheckCircle, SlidersHorizontal } from "lucide-react";

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

function ResourceCard({ resource }: { resource: Resource }) {
  const typeColor = TYPE_COLORS[resource.resourceType?.id] ?? { bg: "#F5EDD8", color: "#4A5E6D" };
  const stars = resource.ratingAverage;
  const wait = resource.waitTimeMinutesAverage;

  return (
    <Link href={`/resources/${resource.id}`}>
      <div className="rounded-2xl bg-white p-4 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
        style={{ border: "1px solid rgba(210,195,165,0.45)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold leading-tight truncate" style={{ color: "#1E2D3D" }}>
              {resource.name}
            </p>
            {resource.city && (
              <p className="text-[12px] mt-0.5" style={{ color: "#8A9AAA" }}>{resource.city}{resource.zipCode ? `, ${resource.zipCode}` : ""}</p>
            )}
          </div>
          <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: typeColor.bg, color: typeColor.color }}>
            {TYPE_LABELS[resource.resourceType?.id] ?? resource.resourceType?.name}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {stars > 0 && (
            <div className="flex items-center gap-1">
              <Star size={11} style={{ color: "#F5A623" }} fill="#F5A623" />
              <span className="text-[12px] font-medium" style={{ color: "#4A5E6D" }}>{stars.toFixed(1)}</span>
            </div>
          )}
          {wait > 0 && (
            <div className="flex items-center gap-1">
              <Clock size={11} style={{ color: "#8A9AAA" }} />
              <span className="text-[12px]" style={{ color: "#8A9AAA" }}>{wait}m avg wait</span>
            </div>
          )}
          {resource.acceptingNewClients && (
            <div className="flex items-center gap-1">
              <CheckCircle size={11} style={{ color: "#3DBFAC" }} />
              <span className="text-[12px]" style={{ color: "#3DBFAC" }}>Accepting clients</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function ResourcesInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [zip, setZip] = useState(searchParams.get("zip") ?? "");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") ?? "");
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const loadResources = useCallback(async (q: string, z: string, type: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ take: "30" });
      if (q) params.set("text", q);
      if (z) params.set("zip", z);
      if (type) params.set("resourceTypeId", type);
      const res = await fetch(`/api/resources?${params}`);
      const data = await res.json() as { resources: Resource[]; count: number };
      setResources(data.resources ?? []);
      setTotal(data.count ?? 0);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResources(query, zip, typeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (zip) params.set("zip", zip);
    if (typeFilter) params.set("type", typeFilter);
    router.push(`/resources?${params}`);
    loadResources(query, zip, typeFilter);
  };

  const handleTypeToggle = (type: string) => {
    const next = typeFilter === type ? "" : type;
    setTypeFilter(next);
    loadResources(query, zip, next);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5EDD8" }}>
      <Navbar />

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#1E2D3D" }}>Browse Resources</h1>
          <p className="text-[13px]" style={{ color: "#8A9AAA" }}>
            Find food pantries, soup kitchens, and SNAP/EBT resources near you.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="flex gap-2 mb-3">
            <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white"
              style={{ border: "1px solid rgba(210,195,165,0.45)" }}>
              <Search size={14} style={{ color: "#9AAAB8" }} />
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or keyword..."
                className="flex-1 bg-transparent outline-none text-[13px]" style={{ color: "#1E2D3D" }} />
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white w-36"
              style={{ border: "1px solid rgba(210,195,165,0.45)" }}>
              <span className="text-[11px]" style={{ color: "#9AAAB8" }}>ZIP</span>
              <input type="text" value={zip} onChange={(e) => setZip(e.target.value)}
                placeholder="10001" maxLength={5}
                className="flex-1 bg-transparent outline-none text-[13px]" style={{ color: "#1E2D3D" }} />
            </div>
            <button type="submit"
              className="px-5 py-2.5 rounded-xl text-white font-semibold text-[13px] transition-all hover:shadow-md"
              style={{ background: "linear-gradient(135deg, #3DBFAC 0%, #27A090 100%)" }}>
              Search
            </button>
          </div>

          {/* Type filters */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={13} style={{ color: "#9AAAB8" }} />
            {Object.entries(TYPE_LABELS).map(([id, label]) => {
              const active = typeFilter === id;
              const colors = TYPE_COLORS[id];
              return (
                <button key={id} type="button" onClick={() => handleTypeToggle(id)}
                  className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
                  style={{
                    backgroundColor: active ? colors.color : "white",
                    color: active ? "white" : colors.color,
                    border: `1px solid ${colors.color}40`,
                  }}>
                  {label}
                </button>
              );
            })}
          </div>
        </form>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "#3DBFAC", borderTopColor: "transparent" }} />
          </div>
        ) : (
          <>
            <p className="text-[12px] mb-4" style={{ color: "#9AAAB8" }}>
              {total > 0 ? `${total.toLocaleString()} results` : "No results found"}
            </p>
            <div className="flex flex-col gap-3">
              {resources.map((r) => <ResourceCard key={r.id} resource={r} />)}
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default function ResourcesPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center" style={{ color: "#9AAAB8" }}>Loading...</div>}>
      <ResourcesInner />
    </Suspense>
  );
}
