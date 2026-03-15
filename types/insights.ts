/**
 * Stable types for the insights API. The agent and visualizations depend on this shape.
 */

export type GeoLevel = "local_area" | "county" | "tract";

export interface InsightsFilters {
  city: string;
  year: number;
  geo: GeoLevel;
  nta?: string;
  minWeightedScore?: number;
  maxWeightedScore?: number;
  /** When geo=county: only include areas with at least this many pantries (so you can see need + supply together). */
  minPantries?: number;
  limit?: number;
}

export interface LocalAreaGeo {
  local_area_code: string;
  local_area_name: string;
  city_code: string;
}

export interface LemontreeAggregate {
  num_pantries: number;
  num_with_fresh_produce: number;
  num_with_meat: number;
  avg_wait_time_min: number | null;
  sample_resource_ids: string[];
}

/**
 * Public dataset indicators merged per area for layering on Lemontree visuals.
 * All fields are optional; null/undefined when dataset not available for that geography/year.
 *
 * Sources:
 * - NYC food insecurity (NTA): food_insecure_pct, supply_gap_lbs, vulnerable_pop, weighted_score, rank
 * - Census ACS (county→NTA): population, poverty_count, poverty_total; derived: poverty_rate
 * - BLS LAUS (county→NTA): unemployment_rate
 * - USDA FARA (county→NTA): low_access_share (% pop with low access to food stores)
 */
export interface PublicIndicators {
  food_insecure_pct: number | null;
  unemployment_rate: number | null;
  supply_gap_lbs: number | null;
  vulnerable_pop: number | null;
  weighted_score: number | null;
  rank?: number | null;
  population?: number | null;
  poverty_count?: number | null;
  poverty_total?: number | null;
  poverty_rate?: number | null;
  low_access_share?: number | null;
  [key: string]: number | null | undefined;
}

export interface LocalAreaInsight {
  geo: LocalAreaGeo;
  lemontree: LemontreeAggregate;
  public: PublicIndicators;
}

export interface InsightsResponse {
  filters: InsightsFilters;
  areas: LocalAreaInsight[];
  sources: { lemontree: boolean; publicDatasetIds: string[] };
}

export interface PublicDatasetMeta {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  format: string;
  geoLevel: string;
  enabled: boolean;
  lastIngestedAt: string | null;
}
