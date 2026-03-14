/**
 * Stable types for the insights API. The agent and visualizations depend on this shape.
 */

export type GeoLevel = "local_area" | "tract";

export interface InsightsFilters {
  city: string;
  year: number;
  geo: GeoLevel;
  nta?: string;
  minWeightedScore?: number;
  maxWeightedScore?: number;
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

export interface PublicIndicators {
  food_insecure_pct: number | null;
  unemployment_rate: number | null;
  supply_gap_lbs: number | null;
  vulnerable_pop: number | null;
  weighted_score: number | null;
  rank?: number | null;
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
