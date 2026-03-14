/**
 * Registry of public datasets for overlaying need/supply context with LemonTree food bank data.
 *
 * Geography: LemonTree resources are keyed by zip → NTA (neighborhood). We ingest:
 * - NTA-level: NYC Open Data (food insecurity, weighted score) → direct match to LemonTree NTAs.
 * - County-level: Census, BLS, USDA → joined to NTAs via county_fips (NTA prefix BX/BK/MN/QN/SI → 36005/36047/36061/36081/36085).
 *
 * Indicators used in insights (see types/insights.ts PublicIndicators):
 * - food_insecure_pct, supply_gap_lbs, vulnerable_pop, weighted_score, rank → NYC food insecurity (NTA).
 * - population, poverty_count, poverty_total → Census ACS (county → NTA).
 * - unemployment_rate → BLS LAUS (county → NTA).
 * - low_access_share → USDA FARA (county → NTA); % population with low access to food stores.
 *
 * API keys: CENSUS_API_KEY and BLS_API_KEY in .env.local. USDA ERS GIS portal is public (no key).
 */

export type DatasetFormat =
  | "socrata_json"
  | "census_json"
  | "bls_json"
  | "esri_rest";

export type GeoLevel = "local_area" | "county";

export interface PublicDatasetConfig {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  format: DatasetFormat;
  geoLevel: GeoLevel;
  geoKeyColumn: string;
  timeKeyColumn: string;
  schemaMapping: Record<string, string>;
  enabled: boolean;
  /** Optional: Census year and variables (for census_json) */
  options?: {
    censusYear?: number;
    censusVariables?: string[];
    censusStateFips?: string;
    censusCounties?: string[];
    /** BLS series IDs for county unemployment (for bls_json) */
    blsSeriesIds?: string[];
    blsStartYear?: number;
    blsEndYear?: number;
    /** Esri: outFields comma list (for esri_rest) */
    esriOutFields?: string;
    /** Esri: limit to these county FIPS (e.g. NYC boroughs) to reduce payload */
    esriCountyFips?: string[];
    /** Esri: when true, layer is tract-level; geoKeyColumn is GEOID10 (11-char), county_fips = first 5 chars, and where uses LIKE '36xxx%' */
    esriCountyFipsFromGeoId?: boolean;
  };
}

/** NYC county FIPS (state 36 + county): Bronx, Kings, New York, Queens, Richmond */
const NYC_COUNTY_FIPS = ["36005", "36047", "36061", "36081", "36085"];

/** BLS LAUS county unemployment rate series: LAUCN + state(2) + county(3) + 0000000003 */
const BLS_NYC_SERIES = NYC_COUNTY_FIPS.map(
  (fips) => `LAUCN${fips}0000000003`
);

export const PUBLIC_DATASETS: PublicDatasetConfig[] = [
  {
    id: "nyc-food-insecurity",
    name: "NYC Food Security Context",
    provider: "NYC Open Data",
    baseUrl: "https://data.cityofnewyork.us/resource/4kc9-zrs2.json",
    format: "socrata_json",
    geoLevel: "local_area",
    geoKeyColumn: "nta",
    timeKeyColumn: "year",
    schemaMapping: {
      food_insecure_pct: "food_insecure_percentage",
      unemployment_rate: "unemployment_rate",
      supply_gap_lbs: "supply_gap_lbs",
      vulnerable_pop: "vulnerable_population",
      weighted_score: "weighted_score",
      rank: "rank",
    },
    enabled: true,
  },
  // Census ACS 5-year: poverty, population at county level (NYC 5 boroughs)
  {
    id: "census-acs5-county",
    name: "Census ACS 5-Year (County)",
    provider: "U.S. Census Bureau",
    baseUrl: "https://api.census.gov/data",
    format: "census_json",
    geoLevel: "county",
    geoKeyColumn: "county",
    timeKeyColumn: "year",
    schemaMapping: {
      population: "B01003_001E",
      poverty_count: "B17001_002E",
      poverty_total: "B17001_001E",
    },
    enabled: true,
    options: {
      censusYear: 2022,
      censusVariables: ["NAME", "B01003_001E", "B17001_002E", "B17001_001E"],
      censusStateFips: "36",
      censusCounties: ["005", "047", "061", "081", "085"],
    },
  },
  // BLS LAUS: county unemployment rates
  {
    id: "bls-laus-county",
    name: "BLS LAUS County Unemployment",
    provider: "Bureau of Labor Statistics",
    baseUrl: "https://api.bls.gov/publicAPI/v2/timeseries/data/",
    format: "bls_json",
    geoLevel: "county",
    geoKeyColumn: "seriesId",
    timeKeyColumn: "year",
    schemaMapping: {
      unemployment_rate: "value",
    },
    enabled: true,
    options: {
      blsSeriesIds: BLS_NYC_SERIES,
      blsStartYear: 2022,
      blsEndYear: 2024,
    },
  },
  // USDA ERS Food Environment Atlas: Food Assistance (county-level). Disabled: service often returns "MapServer not started". Re-enable when USDA brings it back up.
  {
    id: "usda-fea-food-assistance",
    name: "USDA Food Environment Atlas - Food Assistance",
    provider: "USDA ERS",
    baseUrl:
      "https://gisportal.ers.usda.gov/server/rest/services/FEA/Food_Assistance/MapServer/0",
    format: "esri_rest",
    geoLevel: "county",
    geoKeyColumn: "FIPS",
    timeKeyColumn: "year",
    schemaMapping: {
      snap_participation_pct: "SNAP_PART",
      wic_authorized_stores: "WIC_STORES",
    },
    enabled: false,
    options: {
      esriOutFields: "FIPS,NAME,SNAP_PART,WIC_STORES",
      esriCountyFips: NYC_COUNTY_FIPS,
    },
  },
  // USDA ERS Food Access Research Atlas 2019 (tract-level; we aggregate to county). Layer 1 = feature layer. Year 2022 so it merges with Census/BLS in insights.
  {
    id: "usda-fara-2019",
    name: "USDA Food Access Research Atlas 2019",
    provider: "USDA ERS",
    baseUrl:
      "https://gisportal.ers.usda.gov/server/rest/services/FARA/FARA_2019/MapServer/1",
    format: "esri_rest",
    geoLevel: "county",
    geoKeyColumn: "GEOID10",
    timeKeyColumn: "year",
    schemaMapping: {
      low_access_share: "lapop1share",
    },
    enabled: true,
    options: {
      esriOutFields: "GEOID10,St_Name,Cnty_Name,lapop1share",
      esriCountyFips: NYC_COUNTY_FIPS,
      esriCountyFipsFromGeoId: true,
      censusYear: 2022,
    },
  },
];

export function getEnabledDatasets(): PublicDatasetConfig[] {
  return PUBLIC_DATASETS.filter((d) => d.enabled);
}
