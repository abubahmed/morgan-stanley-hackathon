import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { PublicDatasetConfig } from "./registry";
import type { CachedDatasetRow } from "./cache";
import { getCachePath, readCached } from "./cache";

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Fetch and normalize a single dataset into our canonical row shape.
 */
export async function fetchAndNormalize(
  config: PublicDatasetConfig
): Promise<CachedDatasetRow[]> {
  switch (config.format) {
    case "socrata_json":
      return fetchSocrata(config);
    case "census_json":
      return fetchCensus(config);
    case "bls_json":
      return fetchBls(config);
    case "esri_rest":
      return fetchEsri(config);
    default:
      throw new Error(`Unknown format: ${(config as { format: string }).format}`);
  }
}

async function fetchSocrata(
  config: PublicDatasetConfig
): Promise<CachedDatasetRow[]> {
  const res = await fetch(config.baseUrl);
  if (!res.ok) throw new Error(`Fetch failed: ${config.baseUrl} ${res.status}`);
  const raw = (await res.json()) as Record<string, unknown>[];
  const mapping = config.schemaMapping;
  const rows: CachedDatasetRow[] = raw.map((r) => {
    const year = toNum(r[config.timeKeyColumn]) ?? new Date().getFullYear();
    const local_area_code = String(r[config.geoKeyColumn] ?? "");
    const local_area_name =
      typeof r.nta_name === "string" ? r.nta_name : undefined;
    const out: CachedDatasetRow = {
      year,
      local_area_code,
      local_area_name,
      city_code: "nyc",
    };
    for (const [stdKey, sourceKey] of Object.entries(mapping)) {
      const val = r[sourceKey];
      out[stdKey] = toNum(val) ?? null;
    }
    return out;
  });
  return rows;
}

/** Census API: GET returns [ headers, ...rows ]. National: loop all states (for=county:*&in=state:XX). */
async function fetchCensus(
  config: PublicDatasetConfig
): Promise<CachedDatasetRow[]> {
  const key = process.env.CENSUS_API_KEY;
  if (!key) throw new Error("CENSUS_API_KEY is not set");
  const opts = config.options ?? {};
  const year = opts.censusYear ?? 2022;
  const vars = opts.censusVariables ?? [
    "NAME",
    "B01003_001E",
    "B17001_002E",
    "B17001_001E",
  ];
  const mapping = config.schemaMapping;
  const allRows: CachedDatasetRow[] = [];

  if (opts.censusNational) {
    const stateFipsPath = join(process.cwd(), "data", "geo", "us-state-fips.json");
    if (!existsSync(stateFipsPath)) throw new Error("data/geo/us-state-fips.json required for national Census");
    const stateFipsList = JSON.parse(readFileSync(stateFipsPath, "utf-8")) as string[];
    for (const state of stateFipsList) {
      const url = `${config.baseUrl}/${year}/acs/acs5?get=${vars.join(",")}&for=county:*&in=state:${state}&key=${key}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Census API error: ${res.status} state=${state}`);
      const raw = (await res.json()) as unknown[][];
      const [header, ...dataRows] = raw as string[][];
      for (const row of dataRows) {
        const rec: Record<string, string> = {};
        header.forEach((h, i) => {
          rec[h] = String(row[i] ?? "");
        });
        const stateFips = rec.state ?? "";
        const countyFips = rec.county ?? "";
        const county_fips = stateFips + countyFips;
        const out: CachedDatasetRow = { year, county_fips };
        for (const [stdKey, sourceKey] of Object.entries(mapping)) {
          const val = rec[sourceKey];
          out[stdKey] = toNum(val) ?? null;
        }
        allRows.push(out);
      }
    }
    return allRows;
  }

  const state = opts.censusStateFips ?? "36";
  const counties = opts.censusCounties ?? ["005", "047", "061", "081", "085"];
  const url = `${config.baseUrl}/${year}/acs/acs5?get=${vars.join(",")}&for=county:${counties.join(",")}&in=state:${state}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Census API error: ${res.status}`);
  const raw = (await res.json()) as unknown[][];
  const [header, ...dataRows] = raw as string[][];
  return dataRows.map((row) => {
    const rec: Record<string, string> = {};
    header.forEach((h, i) => {
      rec[h] = String(row[i] ?? "");
    });
    const stateFips = rec.state ?? "";
    const countyFips = rec.county ?? "";
    const county_fips = stateFips + countyFips;
    const out: CachedDatasetRow = { year, county_fips };
    for (const [stdKey, sourceKey] of Object.entries(mapping)) {
      const val = rec[sourceKey];
      out[stdKey] = toNum(val) ?? null;
    }
    return out;
  });
}

const BLS_SERIES_LIMIT = 50;

/** BLS API v2: POST with series IDs. National: build series from census-acs5-county cache, batch 50 per request. */
async function fetchBls(config: PublicDatasetConfig): Promise<CachedDatasetRow[]> {
  const key = process.env.BLS_API_KEY;
  if (!key) throw new Error("BLS_API_KEY is not set");
  const opts = config.options ?? {};
  let seriesIds = opts.blsSeriesIds ?? [];
  if (opts.blsNational) {
    const censusRows = readCached("census-acs5-county");
    if (!censusRows?.length) throw new Error("Run Census ingest first (census-acs5-county) for BLS national");
    const countyFips = [...new Set(censusRows.map((r) => String(r.county_fips ?? "").trim()).filter(Boolean))];
    seriesIds = countyFips.map((fips) => `LAUCN${fips}0000000003`);
  }
  const startYear = opts.blsStartYear ?? 2022;
  const endYear = opts.blsEndYear ?? 2024;
  if (seriesIds.length === 0) return [];

  const rows: CachedDatasetRow[] = [];
  for (let i = 0; i < seriesIds.length; i += BLS_SERIES_LIMIT) {
    const chunk = seriesIds.slice(i, i + BLS_SERIES_LIMIT);
    const res = await fetch(config.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seriesid: chunk,
        startyear: String(startYear),
        endyear: String(endYear),
        registrationkey: key,
      }),
    });
    if (!res.ok) throw new Error(`BLS API error: ${res.status}`);
    const json = (await res.json()) as {
      Results?:
        | { seriesID: string; data: { year: string; value: string }[] }[]
        | { series: { seriesID: string; data: { year: string; value: string }[] }[] };
    };
    const raw = json.Results;
    const results = Array.isArray(raw)
      ? raw
      : (raw && typeof raw === "object" && Array.isArray((raw as { series?: unknown[] }).series))
        ? (raw as { series: { seriesID: string; data: { year: string; value: string }[] }[] }).series
        : [];
    for (const s of results) {
      const m = /LAUCN(\d{5})/.exec(s.seriesID);
      const county_fips = m ? m[1] : s.seriesID;
      for (const d of s.data ?? []) {
        const year = parseInt(d.year, 10);
        const value = toNum(d.value);
        rows.push({ year, county_fips, unemployment_rate: value });
      }
    }
  }
  return rows;
}

/** USDA ERS / Esri REST: query MapServer layer. National: where=1=1 (all features). */
async function fetchEsri(
  config: PublicDatasetConfig
): Promise<CachedDatasetRow[]> {
  const opts = config.options ?? {};
  const outFields = opts.esriOutFields ?? "*";
  const fipsList = opts.esriNational ? undefined : opts.esriCountyFips;
  const fromGeoId = opts.esriCountyFipsFromGeoId === true;
  let where = "1=1";
  if (fipsList?.length && config.geoKeyColumn) {
    if (fromGeoId) {
      where = fipsList.map((f) => `${config.geoKeyColumn} LIKE '${f}%'`).join(" OR ");
    } else {
      where = `${config.geoKeyColumn} IN (${fipsList.map((f) => `'${f}'`).join(",")})`;
    }
  }
  // USDA ERS GIS portal (gisportal.ers.usda.gov) is public; do not send token (causes "Invalid Token").
  const queryUrl = `${config.baseUrl}/query?where=${encodeURIComponent(where)}&outFields=${encodeURIComponent(outFields)}&returnGeometry=false&f=json`;
  const res = await fetch(queryUrl);
  if (!res.ok) throw new Error(`Esri query error: ${res.status}`);
  const json = (await res.json()) as {
    error?: { code?: number; message?: string };
    features?: { attributes: Record<string, unknown> }[];
  };
  if (json.error?.message) {
    throw new Error(`Esri service error: ${json.error.message}`);
  }
  const features = json.features ?? [];
  const mapping = config.schemaMapping;
  const year = opts.censusYear ?? 2019; // ERS Food Atlas is static, use a year for join
  let rows: CachedDatasetRow[] = features.map((f) => {
    const a = f.attributes ?? {};
    const geoVal = String(a[config.geoKeyColumn] ?? "").trim();
    const county_fips = fromGeoId && geoVal.length >= 5 ? geoVal.substring(0, 5) : geoVal;
    const out: CachedDatasetRow = {
      year,
      county_fips,
    };
    for (const [stdKey, sourceKey] of Object.entries(mapping)) {
      const val = a[sourceKey];
      out[stdKey] = toNum(val) ?? null;
    }
    return out;
  });
  // Tract-level layers (esriCountyFipsFromGeoId): aggregate to one row per county (average of numeric fields)
  if (fromGeoId && rows.length > 0) {
    const byCounty = new Map<string, { sum: Record<string, number>; n: number }>();
    for (const r of rows) {
      const cf = String(r.county_fips ?? "").trim();
      if (!cf) continue;
      const cur = byCounty.get(cf) ?? { sum: {}, n: 0 };
      cur.n += 1;
      for (const [k, v] of Object.entries(r)) {
        if (k === "year" || k === "county_fips") continue;
        if (typeof v === "number" && Number.isFinite(v)) {
          cur.sum[k] = (cur.sum[k] ?? 0) + v;
        }
      }
      byCounty.set(cf, cur);
    }
    rows = Array.from(byCounty.entries()).map(([county_fips, { sum, n }]) => {
      const out: CachedDatasetRow = { year, county_fips };
      for (const k of Object.keys(sum)) {
        out[k] = n > 0 ? (sum[k] ?? 0) / n : null;
      }
      return out;
    });
  }
  return rows;
}
