# Data Schema Reference

All DataFrames are pre-loaded. County-level datasets join on `fips`. Resources use `zip_code` — use `zip_county` crosswalk to bridge to `fips`.

---

## Resources (food helpline platform)

### `resources` — one row per food resource
id, name, description, resource_type_id (FOOD_PANTRY|SOUP_KITCHEN|SNAP_EBT), resource_status_id (PUBLISHED|UNAVAILABLE), address_street1, city, state, zip_code, latitude, longitude, timezone, confidence (0-1), priority, rating_average, wait_time_minutes_average, accepting_new_clients, appointment_required, open_by_appointment, website, usage_limit_count, usage_limit_interval_count, usage_limit_interval_unit, usage_limit_calendar_reset, review_count, subscription_count, phones (JSON), image_urls (JSON), tag_ids (JSON), region_ids (JSON), regions_served_ids (JSON), regional_zip_codes (JSON)

### `shifts` — recurring schedule rules, join on resource_id
id, resource_id, appointment_required, is_all_day, start_time, end_time, duration_minutes, recurrence_pattern (iCal RRULE), address, latitude, longitude, location_name, resource_type_id, tag_ids (JSON)

### `occurrences` — specific scheduled events, join on shift_id/resource_id
id, shift_id, resource_id, address, appointment_required, confirmed_at, skipped_at (non-null = cancelled), start_time, end_time, title, description, latitude, longitude, location_name, resource_type_id, holidays (JSON), tag_ids (JSON)

### `tags` — lookup table for tag IDs
id, name (e.g. "ID required", "Halal options"), tag_category_id (REQUIREMENT|OFFERING)

### `flags` — quality/moderation flags, join on resource_id
id, resource_id, source_id, note, cleared_at, abandoned_for_reason, postpone_until, parent_notes, proposed_changes (JSON)

---

## Census (ACS 1-Year, county-level, 2014–2023 excluding 2020)

All census tables: year, fips, state_fips, county_fips + data columns. ~870 counties (65k+ pop).

### `census_demographics` — population, age, sex, race
total_population, male_population, female_population, median_age, white_alone, black_alone, native_alone, asian_alone, pacific_islander_alone, other_race_alone, two_or_more_races, hispanic_or_latino, male_under_5, male_5_to_9, male_10_to_14, male_15_to_17, male_65_to_66, male_67_to_69, male_70_to_74, male_75_to_79, male_80_to_84, male_85_and_over

### `census_poverty` — poverty and SNAP participation
poverty_universe, below_poverty_level, snap_universe, snap_received, snap_not_received, families_poverty_universe, families_below_poverty, poverty_by_age_universe, poverty_by_age_below, ratio_income_poverty_universe, ratio_under_0_50, ratio_0_50_to_0_99, ratio_1_00_to_1_24, ratio_1_25_to_1_49, ratio_1_50_to_1_84, ratio_1_85_to_1_99

### `census_income` — household income distribution
median_household_income, aggregate_household_income, hh_income_universe, hh_income_under_10k through hh_income_200k_plus (16 brackets), per_capita_income, gini_index (0-1)

### `census_housing` — occupancy, costs, affordability
total_housing_units, occupied_units, vacant_units, owner_occupied, renter_occupied, median_home_value, median_gross_rent, median_rent_pct_income, housing_cost_universe, owner_cost_universe, renter_cost_universe

### `census_education` — attainment for 25+
edu_universe_25_plus, no_schooling, high_school_diploma, ged, associates_degree, bachelors_degree, masters_degree, professional_degree, doctorate_degree

### `census_commute` — transportation and vehicle ownership
total_workers, drove_alone, carpooled, public_transit, bus, subway, bicycle, walked, worked_from_home, total_households_vehicles, no_vehicle, one_vehicle, two_vehicles, three_vehicles, four_plus_vehicles

### `census_geography` — FIPS lookup (no year column)
state_fips, county_fips, fips, name (e.g. "Los Angeles County, California")

---

## USDA Food Environment Atlas (`usda_food_env`) — snapshot, ~3,150 counties

One row per county. Columns: fips, state (2-letter), county + 61 data columns.

Key columns: low_access_pop, pct_low_access, grocery_stores, grocery_stores_per_1k, convenience_stores, dollar_stores, snap_authorized_stores, fast_food_restaurants, full_service_restaurants, pct_snap_participants, snap_benefits_per_capita, food_banks, farmers_markets, food_insecurity_rate (state-level), very_low_food_security_rate, pct_adult_obesity, pct_adult_diabetes, poverty_rate, median_household_income, metro_nonmetro, child_poverty_rate, pct_free_lunch_eligible

---

## CDC PLACES (`cdc_health`) — 2023 snapshot, ~2,957 counties

One row per county. Columns: fips, state (2-letter), county + 24 health measures (all % prevalence).

Health: diabetes_pct, obesity_pct, heart_disease_pct, stroke_pct, copd_pct, asthma_pct, depression_pct, high_blood_pressure_pct, high_cholesterol_pct
Status: frequent_mental_distress_pct, frequent_physical_distress_pct, poor_health_pct
Behavior: physical_inactivity_pct, smoking_pct, binge_drinking_pct, short_sleep_pct
Food/housing/transport: food_insecurity_pct, food_stamp_pct, lack_transportation_pct, housing_insecurity_pct
Social/access: loneliness_pct, lack_social_support_pct, no_health_insurance_pct, any_disability_pct

---

## Crosswalk (`zip_county`) — ZIP to county FIPS mapping

zip_code, fips, state_fips, county_fips, county_name. ~33,000 rows.
Join: `resources.merge(zip_county, on="zip_code").merge(census_poverty, on="fips")`

---

## Reviews (`reviews`) — 3,000 generated reviews, 3-year span

Shared pool for any resource. If asked about a specific resource's reviews, use the full dataset.

id, created_at (datetime), attended (bool), did_not_attend_reason, rating (1-5), text, wait_time_minutes, information_accurate (bool)

Distribution: ~60% positive (4-5), ~25% neutral (2-3), ~15% negative (1-2).
