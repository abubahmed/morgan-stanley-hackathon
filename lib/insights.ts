import { getResources } from "./lemontree_api";
import { getLemontreeByCountyFromCache } from "./lemontree_aggregate";
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
let zipToCounty: Record<string, string> | null = null;

function getZipToNta(): Record<string, string> {
  if (zipToNta) return zipToNta;
  const path = join(process.cwd(), "data", "geo", "zip-to-nta-nyc.json");
  if (!existsSync(path)) return {};
  zipToNta = JSON.parse(readFileSync(path, "utf-8")) as Record<string, string>;
  return zipToNta;
}

function getZipToCounty(): Record<string, string> {
  if (zipToCounty) return zipToCounty;
  const path = join(process.cwd(), "data", "geo", "zip-to-county-us.json");
  if (!existsSync(path)) return {};
  zipToCounty = JSON.parse(readFileSync(path, "utf-8")) as Record<string, string>;
  return zipToCounty;
}

function hasTag(resource: { tags?: { name: string }[] }, name: string): boolean {
  const n = name.toLowerCase();
  return (resource.tags ?? []).some((t) => t.name?.toLowerCase().includes(n));
}

/**
 * Fetch Lemontree resources for NYC and aggregate by NTA (via zip).
 */
async function getLemontreeByNta(): Promise<Map<string, LemontreeAggregate>> {
  const zipToNtaMap = getZipToNta();
  const byNta = new Map<string, { ids: string[]; waitTimes: number[]; fresh: number; meat: number }>();

  try {
    const res = await getResources({
      lat: NYC_BOUNDS.lat,
      lng: NYC_BOUNDS.lng,
      take: MAX_RESOURCES,
    });
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

/** NYC NTA prefix -> county FIPS (Bronx, Kings, New York, Queens, Richmond) */
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

/**
 * Pick the best-available row per geo key: latest year <= requested year.
 * Ensures all dataset layers are used for visuals even when exact year is missing (e.g. Census 2022 + request 2025).
 */
function bestRowByGeoKey<T extends { year: number }>(
  rows: T[],
  year: number,
  getGeoKey: (row: T) => string
): Map<string, T> {
  const byKey = new Map<string, T>();
  for (const row of rows) {
    if (row.year > year) continue;
    const key = getGeoKey(row);
    if (!key) continue;
    const existing = byKey.get(key);
    if (!existing || row.year > existing.year) byKey.set(key, row);
  }
  return byKey;
}

/**
 * Build PublicIndicators from a cached row (all numeric fields except year/geo keys).
 */
function rowToIndicators(row: CachedDatasetRow, excludeKeys: string[]): PublicIndicators {
  const indicators: PublicIndicators = {
    food_insecure_pct: null,
    unemployment_rate: null,
    supply_gap_lbs: null,
    vulnerable_pop: null,
    weighted_score: null,
  };
  for (const [k, v] of Object.entries(row)) {
    if (excludeKeys.includes(k)) continue;
    if (typeof v === "number" && Number.isFinite(v)) (indicators as Record<string, number | null>)[k] = v;
  }
  return indicators;
}

/**
 * Add derived indicators useful for visualizations (e.g. poverty_rate from Census).
 */
function addDerivedIndicators(indicators: PublicIndicators): void {
  const total = indicators.poverty_total;
  const count = indicators.poverty_count;
  if (typeof total === "number" && total > 0 && typeof count === "number" && Number.isFinite(count)) {
    (indicators as Record<string, number | null>).poverty_rate = count / total;
  }
}

/**
 * Load public indicators for city/year from all enabled dataset caches.
 * Uses best-available year per dataset when exact year is missing so all layers can be visualized.
 * - local_area datasets: keyed by local_area_code (NTA).
 * - county datasets: keyed by county_fips; merged into each NTA by NTA->county lookup.
 */
function loadPublicIndicators(
  cityCode: string,
  year: number
): Map<string, { indicators: PublicIndicators; name?: string }> {
  const byArea = new Map<string, { indicators: PublicIndicators; name?: string }>();
  const byCounty = new Map<string, PublicIndicators>();
  const datasets = getEnabledDatasets();

  // County-level: one best row per county_fips, then merge all dataset indicators per county
  for (const config of datasets) {
    if (config.geoLevel !== "county") continue;
    const rows = readCached(config.id) as CachedDatasetRow[] | null;
    if (!rows?.length) continue;
    const bestByCounty = bestRowByGeoKey(rows, year, (r) => String(r.county_fips ?? "").trim());
    for (const [county_fips, row] of bestByCounty) {
      if (!county_fips) continue;
      const indicators = rowToIndicators(row, ["year", "county_fips"]);
      addDerivedIndicators(indicators);
      byCounty.set(county_fips, { ...byCounty.get(county_fips), ...indicators });
    }
  }

  // Local-area (NTA): best row per local_area_code for this city
  for (const config of datasets) {
    if (config.geoLevel === "county") continue;
    const rows = readCached(config.id) as CachedDatasetRow[] | null;
    if (!rows?.length) continue;
    const cityRows = rows.filter((r) => r.city_code === cityCode);
    const bestByNta = bestRowByGeoKey(cityRows, year, (r) => String(r.local_area_code ?? "").trim());
    for (const [code, row] of bestByNta) {
      if (!code) continue;
      const name = typeof row.local_area_name === "string" ? row.local_area_name : undefined;
      const indicators = rowToIndicators(row, ["year", "local_area_code", "local_area_name", "city_code"]);
      addDerivedIndicators(indicators);
      const countyFips = ntaToCountyFips(code);
      const countyIndicators = countyFips ? byCounty.get(countyFips) : undefined;
      const merged = { ...indicators, ...countyIndicators };
      addDerivedIndicators(merged);
      byArea.set(code, { indicators: merged, name });
    }
  }

  // When only county data exists (no NTA rows), expose borough-level entries for visuals
  if (byCounty.size > 0 && byArea.size === 0) {
    const boroughNames: Record<string, string> = {
      BX: "Bronx",
      BK: "Brooklyn",
      MN: "Manhattan",
      QN: "Queens",
      SI: "Staten Island",
    };
    for (const [prefix, countyFips] of Object.entries(NTA_PREFIX_TO_COUNTY)) {
      const countyIndicators = byCounty.get(countyFips);
      if (countyIndicators) byArea.set(prefix, { indicators: countyIndicators, name: boroughNames[prefix] ?? prefix });
    }
  } else if (byCounty.size > 0) {
    for (const [code, entry] of byArea) {
      const countyFips = ntaToCountyFips(code);
      const countyIndicators = countyFips ? byCounty.get(countyFips) : undefined;
      if (countyIndicators) {
        entry.indicators = { ...entry.indicators, ...countyIndicators };
        addDerivedIndicators(entry.indicators);
      }
    }
  }
  return byArea;
}

/**
 * Load county-level public indicators for a given year (national coverage).
 * Keyed by county_fips. Lemontree is currently only aggregated for NYC (NTA) and
 * is not joined in county mode, so county insights will have lemontree=0 for now.
 */
function loadCountyPublicIndicators(year: number): Map<string, PublicIndicators> {
  const byCounty = new Map<string, PublicIndicators>();
  const datasets = getEnabledDatasets();
  for (const config of datasets) {
    if (config.geoLevel !== "county") continue;
    const rows = readCached(config.id) as CachedDatasetRow[] | null;
    if (!rows?.length) continue;
    const bestByCounty = bestRowByGeoKey(rows, year, (r) => String(r.county_fips ?? "").trim());
    for (const [county_fips, row] of bestByCounty) {
      if (!county_fips) continue;
      const indicators = rowToIndicators(row, ["year", "county_fips"]);
      addDerivedIndicators(indicators);
      byCounty.set(county_fips, { ...byCounty.get(county_fips), ...indicators });
    }
  }
  return byCounty;
}

/**
 * Build the merged insights response for the agent.
 */
export async function buildInsights(filters: InsightsFilters): Promise<InsightsResponse> {
  const { city, year, geo, nta, minWeightedScore, maxWeightedScore, minPantries, limit } = filters;

  // County mode: national coverage by county_fips using public datasets + Lemontree aggregates.
  if (geo === "county") {
    const publicByCounty = loadCountyPublicIndicators(year);
    const lemontreeByCounty = getLemontreeByCountyFromCache();
    let areas: LocalAreaInsight[] = [];
    for (const [county_fips, indicators] of publicByCounty) {
      const score = indicators.weighted_score ?? indicators.poverty_rate ?? null;
      if (minWeightedScore != null && (score === null || score < minWeightedScore)) continue;
      if (maxWeightedScore != null && (score === null || score > maxWeightedScore)) continue;
      const lemontree: LemontreeAggregate =
        lemontreeByCounty.get(county_fips) ?? {
          num_pantries: 0,
          num_with_fresh_produce: 0,
          num_with_meat: 0,
          avg_wait_time_min: null,
          sample_resource_ids: [],
        };
      if (minPantries != null && minPantries > 0 && lemontree.num_pantries < minPantries) continue;
      areas.push({
        geo: {
          local_area_code: county_fips,
          local_area_name: county_fips,
          city_code: "us",
        },
        lemontree,
        public: indicators,
      });
    }
    // Sort by poverty_rate descending (or weighted_score if available)
    areas.sort((a, b) => {
      const sa = (a.public.weighted_score ?? a.public.poverty_rate) ?? -Infinity;
      const sb = (b.public.weighted_score ?? b.public.poverty_rate) ?? -Infinity;
      return sb - sa;
    });
    if (typeof limit === "number" && limit > 0) areas = areas.slice(0, limit);

    const publicDatasetIds = getEnabledDatasets().map((d) => d.id);
    return {
      filters: { city, year, geo },
      areas,
      sources: { lemontree: lemontreeByCounty.size > 0, publicDatasetIds },
    };
  }

  // Default: NYC local-area (NTA) mode with Lemontree layering.
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
      geo: {
        local_area_code,
        local_area_name: name ?? local_area_code,
        city_code: city,
      },
      lemontree,
      public: indicators,
    });
  }

  // Sort by weighted_score descending (highest need first)
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
