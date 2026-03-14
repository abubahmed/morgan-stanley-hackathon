import { getResources } from "./lemontree_api";
import { readCached, getEnabledDatasets } from "./public-datasets";
import type { CachedDatasetRow } from "./public-datasets";
import type {
  InsightsFilters,
  InsightsResponse,
  LocalAreaInsight,
  LemontreeAggregate,
  PublicIndicators,
} from "@/types/insights";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const NYC_BOUNDS = { lat: 40.65, lng: -74.0 } as const;
const MAX_RESOURCES = 500;

let zipToNta: Record<string, string> | null = null;

function getZipToNta(): Record<string, string> {
  if (zipToNta) return zipToNta;
  const path = join(process.cwd(), "data", "geo", "zip-to-nta-nyc.json");
  if (!existsSync(path)) return {};
  zipToNta = JSON.parse(readFileSync(path, "utf-8")) as Record<string, string>;
  return zipToNta;
}

function hasTag(resource: { tags?: { name: string }[] }, name: string): boolean {
  const n = name.toLowerCase();
  return (resource.tags ?? []).some((t) => t.name?.toLowerCase().includes(n));
}

async function getLemontreeByNta(): Promise<Map<string, LemontreeAggregate>> {
  const zipToNtaMap = getZipToNta();
  const byNta = new Map<string, { ids: string[]; waitTimes: number[]; fresh: number; meat: number }>();

  try {
    const res = await getResources({ lat: NYC_BOUNDS.lat, lng: NYC_BOUNDS.lng, take: MAX_RESOURCES });
    const resources = (res as { resources?: unknown[] }).resources ?? [];
    for (const r of resources as { id: string; zipCode?: string | null; waitTimeMinutesAverage?: number | null; tags?: { name: string }[] }[]) {
      const zip = r.zipCode?.trim();
      if (!zip) continue;
      const nta = zipToNtaMap[zip];
      if (!nta) continue;
      let agg = byNta.get(nta);
      if (!agg) {
        agg = { ids: [], waitTimes: [], fresh: 0, meat: 0 };
        byNta.set(nta, agg);
      }
      agg.ids.push(r.id);
      if (typeof r.waitTimeMinutesAverage === "number" && Number.isFinite(r.waitTimeMinutesAverage)) {
        agg.waitTimes.push(r.waitTimeMinutesAverage);
      }
      if (hasTag(r, "produce") || hasTag(r, "vegetable") || hasTag(r, "fruit")) agg.fresh += 1;
      if (hasTag(r, "meat")) agg.meat += 1;
    }
  } catch {
    // Lemontree API may fail; return empty aggregates
  }

  const out = new Map<string, LemontreeAggregate>();
  for (const [nta, agg] of byNta) {
    const waitTimes = agg.waitTimes.filter(Number.isFinite);
    out.set(nta, {
      num_pantries: agg.ids.length,
      num_with_fresh_produce: agg.fresh,
      num_with_meat: agg.meat,
      avg_wait_time_min: waitTimes.length ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : null,
      sample_resource_ids: agg.ids.slice(0, 10),
    });
  }
  return out;
}

const NTA_PREFIX_TO_COUNTY: Record<string, string> = {
  BX: "36005",
  BK: "36047",
  MN: "36061",
  QN: "36081",
  SI: "36085",
};

function ntaToCountyFips(ntaCode: string): string | null {
  const prefix = ntaCode.slice(0, 2).toUpperCase();
  return NTA_PREFIX_TO_COUNTY[prefix] ?? null;
}

function loadPublicIndicators(
  cityCode: string,
  year: number
): Map<string, { indicators: PublicIndicators; name?: string }> {
  const byArea = new Map<string, { indicators: PublicIndicators; name?: string }>();
  const byCounty = new Map<string, PublicIndicators>();
  const datasets = getEnabledDatasets();

  for (const config of datasets) {
    const rows = readCached(config.id);
    if (!rows?.length) continue;
    if (config.geoLevel === "county") {
      for (const row of rows as CachedDatasetRow[]) {
        const county_fips = String(row.county_fips ?? "").trim();
        if (!county_fips || row.year !== year) continue;
        const indicators: PublicIndicators = {} as PublicIndicators;
        for (const [k, v] of Object.entries(row)) {
          if (k === "year" || k === "county_fips") continue;
          if (typeof v === "number" && Number.isFinite(v)) (indicators as Record<string, number | null>)[k] = v;
        }
        byCounty.set(county_fips, { ...byCounty.get(county_fips), ...indicators });
      }
    }
  }

  for (const config of datasets) {
    if (config.geoLevel === "county") continue;
    const rows = readCached(config.id);
    if (!rows?.length) continue;
    for (const row of rows as CachedDatasetRow[]) {
      if (row.city_code !== cityCode || row.year !== year) continue;
      const code = String(row.local_area_code ?? "");
      if (!code) continue;
      const name = typeof row.local_area_name === "string" ? row.local_area_name : undefined;
      const indicators: PublicIndicators = {
        food_insecure_pct: null,
        unemployment_rate: null,
        supply_gap_lbs: null,
        vulnerable_pop: null,
        weighted_score: null,
      };
      for (const [k, v] of Object.entries(row)) {
        if (["year", "local_area_code", "local_area_name", "city_code"].includes(k)) continue;
        if (typeof v === "number" && Number.isFinite(v)) (indicators as Record<string, number | null>)[k] = v;
      }
      const countyFips = ntaToCountyFips(code);
      const countyIndicators = countyFips ? byCounty.get(countyFips) : undefined;
      byArea.set(code, { indicators: { ...indicators, ...countyIndicators }, name });
    }
  }

  if (byCounty.size > 0 && byArea.size === 0) {
    for (const [prefix, countyFips] of Object.entries(NTA_PREFIX_TO_COUNTY)) {
      const countyIndicators = byCounty.get(countyFips);
      if (countyIndicators) byArea.set(prefix, { indicators: countyIndicators });
    }
  } else if (byCounty.size > 0) {
    for (const [code, entry] of byArea) {
      const countyFips = ntaToCountyFips(code);
      const countyIndicators = countyFips ? byCounty.get(countyFips) : undefined;
      if (countyIndicators) entry.indicators = { ...entry.indicators, ...countyIndicators };
    }
  }
  return byArea;
}

export async function buildInsights(filters: InsightsFilters): Promise<InsightsResponse> {
  const { city, year, geo, nta, minWeightedScore, maxWeightedScore, limit } = filters;
  const publicByArea = loadPublicIndicators(city, year);
  const lemontreeByNta = await getLemontreeByNta();

  let areas: LocalAreaInsight[] = [];
  for (const [local_area_code, { indicators, name }] of publicByArea) {
    if (nta && local_area_code !== nta) continue;
    const score = indicators.weighted_score ?? null;
    if (minWeightedScore != null && (score === null || score < minWeightedScore)) continue;
    if (maxWeightedScore != null && (score === null || score > maxWeightedScore)) continue;
    const lemontree = lemontreeByNta.get(local_area_code) ?? {
      num_pantries: 0,
      num_with_fresh_produce: 0,
      num_with_meat: 0,
      avg_wait_time_min: null,
      sample_resource_ids: [],
    };
    areas.push({
      geo: { local_area_code, local_area_name: name ?? local_area_code, city_code: city },
      lemontree,
      public: indicators,
    });
  }

  areas.sort((a, b) => {
    const sa = a.public.weighted_score ?? -Infinity;
    const sb = b.public.weighted_score ?? -Infinity;
    return sb - sa;
  });
  if (typeof limit === "number" && limit > 0) areas = areas.slice(0, limit);

  const publicDatasetIds = getEnabledDatasets().map((d) => d.id);
  return {
    filters: { city, year, geo },
    areas,
    sources: { lemontree: true, publicDatasetIds },
  };
}
