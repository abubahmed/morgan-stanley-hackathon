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
  options?: {
    censusYear?: number;
    censusVariables?: string[];
    censusStateFips?: string;
    censusCounties?: string[];
    blsSeriesIds?: string[];
    blsStartYear?: number;
    blsEndYear?: number;
    esriOutFields?: string;
    esriCountyFips?: string[];
    esriCountyFipsFromGeoId?: boolean;
  };
}

const NYC_COUNTY_FIPS = ["36005", "36047", "36061", "36081", "36085"];

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
