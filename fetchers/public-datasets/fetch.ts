import type { PublicDatasetConfig } from "./registry";
import type { CachedDatasetRow } from "./cache";

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

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

async function fetchSocrata(config: PublicDatasetConfig): Promise<CachedDatasetRow[]> {
  const res = await fetch(config.baseUrl);
  if (!res.ok) throw new Error(`Fetch failed: ${config.baseUrl} ${res.status}`);
  const raw = (await res.json()) as Record<string, unknown>[];
  const mapping = config.schemaMapping;
  return raw.map((r) => {
    const year = toNum(r[config.timeKeyColumn]) ?? new Date().getFullYear();
    const local_area_code = String(r[config.geoKeyColumn] ?? "");
    const local_area_name = typeof r.nta_name === "string" ? r.nta_name : undefined;
    const out: CachedDatasetRow = { year, local_area_code, local_area_name, city_code: "nyc" };
    for (const [stdKey, sourceKey] of Object.entries(mapping)) {
      const val = r[sourceKey];
      out[stdKey] = toNum(val) ?? val;
    }
    return out;
  });
}

async function fetchCensus(config: PublicDatasetConfig): Promise<CachedDatasetRow[]> {
  const key = process.env.CENSUS_API_KEY;
  if (!key) throw new Error("CENSUS_API_KEY is not set");
  const opts = config.options ?? {};
  const year = opts.censusYear ?? 2022;
  const state = opts.censusStateFips ?? "36";
  const counties = opts.censusCounties ?? ["005", "047", "061", "081", "085"];
  const vars = opts.censusVariables ?? ["NAME", "B01003_001E", "B17001_002E", "B17001_001E"];
  const url = `${config.baseUrl}/${year}/acs/acs5?get=${vars.join(",")}&for=county:${counties.join(",")}&in=state:${state}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Census API error: ${res.status}`);
  const raw = (await res.json()) as unknown[][];
  const [header, ...dataRows] = raw as string[][];
  const mapping = config.schemaMapping;
  return dataRows.map((row) => {
    const rec: Record<string, string> = {};
    header.forEach((h, i) => { rec[h] = String(row[i] ?? ""); });
    const county_fips = (rec.state ?? "") + (rec.county ?? "");
    const out: CachedDatasetRow = { year, county_fips };
    for (const [stdKey, sourceKey] of Object.entries(mapping)) {
      out[stdKey] = toNum(rec[sourceKey]) ?? null;
    }
    return out;
  });
}

async function fetchBls(config: PublicDatasetConfig): Promise<CachedDatasetRow[]> {
  const key = process.env.BLS_API_KEY;
  if (!key) throw new Error("BLS_API_KEY is not set");
  const opts = config.options ?? {};
  const seriesIds = opts.blsSeriesIds ?? [];
  if (seriesIds.length === 0) return [];
  const res = await fetch(config.baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      seriesid: seriesIds,
      startyear: String(opts.blsStartYear ?? 2022),
      endyear: String(opts.blsEndYear ?? 2024),
      registrationkey: key,
    }),
  });
  if (!res.ok) throw new Error(`BLS API error: ${res.status}`);
  const json = (await res.json()) as {
    Results?: { seriesID: string; data: { year: string; value: string }[] }[] | {
      series: { seriesID: string; data: { year: string; value: string }[] }[];
    };
  };
  const raw = json.Results;
  const results = Array.isArray(raw)
    ? raw
    : (raw && typeof raw === "object" && Array.isArray((raw as { series?: unknown[] }).series))
      ? (raw as { series: { seriesID: string; data: { year: string; value: string }[] }[] }).series
      : [];
  const rows: CachedDatasetRow[] = [];
  for (const s of results) {
    const m = /LAUCN(\d{5})/.exec(s.seriesID);
    const county_fips = m ? m[1] : s.seriesID;
    for (const d of s.data ?? []) {
      rows.push({ year: parseInt(d.year, 10), county_fips, unemployment_rate: toNum(d.value) });
    }
  }
  return rows;
}

async function fetchEsri(config: PublicDatasetConfig): Promise<CachedDatasetRow[]> {
  const opts = config.options ?? {};
  const outFields = opts.esriOutFields ?? "*";
  const fipsList = opts.esriCountyFips;
  const fromGeoId = opts.esriCountyFipsFromGeoId === true;
  let where = "1=1";
  if (fipsList?.length && config.geoKeyColumn) {
    if (fromGeoId) {
      where = fipsList.map((f) => `${config.geoKeyColumn} LIKE '${f}%'`).join(" OR ");
    } else {
      where = `${config.geoKeyColumn} IN (${fipsList.map((f) => `'${f}'`).join(",")})`;
    }
  }
  const queryUrl = `${config.baseUrl}/query?where=${encodeURIComponent(where)}&outFields=${encodeURIComponent(outFields)}&returnGeometry=false&f=json`;
  const res = await fetch(queryUrl);
  if (!res.ok) throw new Error(`Esri query error: ${res.status}`);
  const json = (await res.json()) as {
    error?: { code?: number; message?: string };
    features?: { attributes: Record<string, unknown> }[];
  };
  if (json.error?.message) throw new Error(`Esri service error: ${json.error.message}`);
  const features = json.features ?? [];
  const year = opts.censusYear ?? 2019;
  let rows: CachedDatasetRow[] = features.map((f) => {
    const a = f.attributes ?? {};
    const geoVal = String(a[config.geoKeyColumn] ?? "").trim();
    const county_fips = fromGeoId && geoVal.length >= 5 ? geoVal.substring(0, 5) : geoVal;
    const out: CachedDatasetRow = { year, county_fips };
    for (const [stdKey, sourceKey] of Object.entries(config.schemaMapping)) {
      out[stdKey] = toNum(a[sourceKey]) ?? null;
    }
    return out;
  });
  if (fromGeoId && rows.length > 0) {
    const byCounty = new Map<string, { sum: Record<string, number>; n: number }>();
    for (const r of rows) {
      const cf = String(r.county_fips ?? "").trim();
      if (!cf) continue;
      const cur = byCounty.get(cf) ?? { sum: {}, n: 0 };
      cur.n += 1;
      for (const [k, v] of Object.entries(r)) {
        if (k === "year" || k === "county_fips") continue;
        if (typeof v === "number" && Number.isFinite(v)) cur.sum[k] = (cur.sum[k] ?? 0) + v;
      }
      byCounty.set(cf, cur);
    }
    rows = Array.from(byCounty.entries()).map(([county_fips, { sum, n }]) => {
      const out: CachedDatasetRow = { year, county_fips };
      for (const k of Object.keys(sum)) out[k] = n > 0 ? (sum[k] ?? 0) / n : null;
      return out;
    });
  }
  return rows;
}
