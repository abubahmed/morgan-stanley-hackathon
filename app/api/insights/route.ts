import { NextRequest } from "next/server";
import { buildInsights } from "@/lib/insights";
import type { InsightsFilters, GeoLevel } from "@/types/insights";

function parseNumber(s: string | null): number | undefined {
  if (s == null) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") ?? "nyc";
  const year = parseNumber(searchParams.get("year")) ?? new Date().getFullYear();
  const geo = (searchParams.get("geo") as GeoLevel) ?? "local_area";
  const nta = searchParams.get("nta") ?? undefined;
  const minWeightedScore = parseNumber(searchParams.get("minWeightedScore"));
  const maxWeightedScore = parseNumber(searchParams.get("maxWeightedScore"));
  const minPantries = parseNumber(searchParams.get("minPantries"));
  const limit = parseNumber(searchParams.get("limit"));

  const filters: InsightsFilters = {
    city,
    year,
    geo,
    nta,
    minWeightedScore,
    maxWeightedScore,
    minPantries,
    limit,
  };

  const data = await buildInsights(filters);
  return Response.json(data);
}
