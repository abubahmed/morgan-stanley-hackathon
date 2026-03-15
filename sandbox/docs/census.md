# Census Data Reference

You have US Census Bureau ACS 1-Year data (2014–2023, excluding 2020) loaded into your sandbox as pandas DataFrames. The data covers county-level demographics, poverty, income, housing, and education for all US counties with 65,000+ population.

The data is split across 6 CSV files, pre-loaded as pandas DataFrames:

---

## `census_demographics` DataFrame

Population counts by age, sex, and race/ethnicity. One row per county per year.

| Column | Type | Description |
|---|---|---|
| year | int | Survey year (2014–2023, no 2020) |
| fips | string | 5-digit FIPS code (state + county), e.g. "36061" |
| state_fips | string | 2-digit state FIPS, e.g. "36" |
| county_fips | string | 3-digit county FIPS, e.g. "061" |
| total_population | int | Total population |
| male_population | int | Male population |
| female_population | int | Female population |
| median_age | float | Median age |
| white_alone | int | White alone |
| black_alone | int | Black or African American alone |
| native_alone | int | American Indian and Alaska Native alone |
| asian_alone | int | Asian alone |
| pacific_islander_alone | int | Native Hawaiian and Other Pacific Islander alone |
| other_race_alone | int | Some other race alone |
| two_or_more_races | int | Two or more races |
| hispanic_or_latino | int | Hispanic or Latino (any race) |
| male_under_5 | int | Males under 5 years |
| male_5_to_9 | int | Males 5 to 9 years |
| male_10_to_14 | int | Males 10 to 14 years |
| male_15_to_17 | int | Males 15 to 17 years |
| male_65_to_66 | int | Males 65 to 66 years |
| male_67_to_69 | int | Males 67 to 69 years |
| male_70_to_74 | int | Males 70 to 74 years |
| male_75_to_79 | int | Males 75 to 79 years |
| male_80_to_84 | int | Males 80 to 84 years |
| male_85_and_over | int | Males 85 years and over |

---

## `census_poverty` DataFrame

Poverty status and SNAP/food stamp participation. One row per county per year.

| Column | Type | Description |
|---|---|---|
| year | int | Survey year |
| fips | string | 5-digit FIPS code |
| state_fips | string | 2-digit state FIPS |
| county_fips | string | 3-digit county FIPS |
| poverty_universe | int | Total population for whom poverty status is determined |
| below_poverty_level | int | Population below poverty level |
| snap_universe | int | Total households for SNAP determination |
| snap_received | int | Households that received SNAP/food stamps |
| snap_not_received | int | Households that did not receive SNAP/food stamps |
| families_poverty_universe | int | Total families for poverty determination |
| families_below_poverty | int | Families below poverty level |
| poverty_by_age_universe | int | Population for poverty-by-age determination |
| poverty_by_age_below | int | Population below poverty by age |
| ratio_income_poverty_universe | int | Population for income-to-poverty ratio |
| ratio_under_0_50 | int | Income less than 50% of poverty level (deep poverty) |
| ratio_0_50_to_0_99 | int | Income 50–99% of poverty level |
| ratio_1_00_to_1_24 | int | Income 100–124% of poverty level |
| ratio_1_25_to_1_49 | int | Income 125–149% of poverty level |
| ratio_1_50_to_1_84 | int | Income 150–184% of poverty level |
| ratio_1_85_to_1_99 | int | Income 185–199% of poverty level |

---

## `census_income` DataFrame

Household income distribution, median income, and inequality. One row per county per year.

| Column | Type | Description |
|---|---|---|
| year | int | Survey year |
| fips | string | 5-digit FIPS code |
| state_fips | string | 2-digit state FIPS |
| county_fips | string | 3-digit county FIPS |
| median_household_income | float | Median household income (dollars) |
| aggregate_household_income | float | Aggregate household income (dollars) |
| hh_income_universe | int | Total households |
| hh_income_under_10k | int | Households with income under $10,000 |
| hh_income_10k_to_15k | int | $10,000 to $14,999 |
| hh_income_15k_to_20k | int | $15,000 to $19,999 |
| hh_income_20k_to_25k | int | $20,000 to $24,999 |
| hh_income_25k_to_30k | int | $25,000 to $29,999 |
| hh_income_30k_to_35k | int | $30,000 to $34,999 |
| hh_income_35k_to_40k | int | $35,000 to $39,999 |
| hh_income_40k_to_45k | int | $40,000 to $44,999 |
| hh_income_45k_to_50k | int | $45,000 to $49,999 |
| hh_income_50k_to_60k | int | $50,000 to $59,999 |
| hh_income_60k_to_75k | int | $60,000 to $74,999 |
| hh_income_75k_to_100k | int | $75,000 to $99,999 |
| hh_income_100k_to_125k | int | $100,000 to $124,999 |
| hh_income_125k_to_150k | int | $125,000 to $149,999 |
| hh_income_150k_to_200k | int | $150,000 to $199,999 |
| hh_income_200k_plus | int | $200,000 or more |
| per_capita_income | float | Per capita income (dollars) |
| gini_index | float | Gini index of income inequality (0–1) |

---

## `census_housing` DataFrame

Housing occupancy, costs, and affordability burden. One row per county per year.

| Column | Type | Description |
|---|---|---|
| year | int | Survey year |
| fips | string | 5-digit FIPS code |
| state_fips | string | 2-digit state FIPS |
| county_fips | string | 3-digit county FIPS |
| total_housing_units | int | Total housing units |
| occupied_units | int | Occupied housing units |
| vacant_units | int | Vacant housing units |
| owner_occupied | int | Owner-occupied units |
| renter_occupied | int | Renter-occupied units |
| median_home_value | float | Median home value (dollars) |
| median_gross_rent | float | Median gross rent (dollars/month) |
| median_rent_pct_income | float | Median gross rent as % of household income |
| housing_cost_universe | int | Occupied units for housing cost computation |
| owner_cost_universe | int | Owner-occupied units for cost computation |
| renter_cost_universe | int | Renter-occupied units for cost computation |

---

## `census_education` DataFrame

Educational attainment for population 25 years and older. One row per county per year.

| Column | Type | Description |
|---|---|---|
| year | int | Survey year |
| fips | string | 5-digit FIPS code |
| state_fips | string | 2-digit state FIPS |
| county_fips | string | 3-digit county FIPS |
| edu_universe_25_plus | int | Total population 25 years and over |
| no_schooling | int | No schooling completed |
| high_school_diploma | int | Regular high school diploma |
| ged | int | GED or alternative credential |
| associates_degree | int | Associate's degree |
| bachelors_degree | int | Bachelor's degree |
| masters_degree | int | Master's degree |
| professional_degree | int | Professional school degree |
| doctorate_degree | int | Doctorate degree |

---

## `census_commute` DataFrame

Commute mode and vehicle ownership. One row per county per year.

| Column | Type | Description |
|---|---|---|
| year | int | Survey year |
| fips | string | 5-digit FIPS code |
| state_fips | string | 2-digit state FIPS |
| county_fips | string | 3-digit county FIPS |
| total_workers | int | Total workers 16 years and over |
| drove_alone | int | Drove alone (car/truck/van) |
| carpooled | int | Carpooled |
| public_transit | int | Public transportation (excluding taxicab) |
| bus | int | Bus |
| subway | int | Subway or elevated rail |
| bicycle | int | Bicycle |
| walked | int | Walked |
| worked_from_home | int | Worked from home |
| total_households_vehicles | int | Total households (for vehicle counts) |
| no_vehicle | int | No vehicle available |
| one_vehicle | int | 1 vehicle available |
| two_vehicles | int | 2 vehicles available |
| three_vehicles | int | 3 vehicles available |
| four_plus_vehicles | int | 4 or more vehicles available |

---

## `census_geography` DataFrame

Lookup table mapping FIPS codes to county and state names. One row per county (not per year).

| Column | Type | Description |
|---|---|---|
| state_fips | string | 2-digit state FIPS |
| county_fips | string | 3-digit county FIPS |
| fips | string | 5-digit FIPS code (state + county) |
| name | string | Full name, e.g. "Los Angeles County, California" |

---

## Relationships

```
census_geography.fips  ──  used by all census_* tables via fips column
All census data tables share: year, fips, state_fips, county_fips
```

To join census data with Lemontree resources, match the resource's `state` and `zip_code` (or `city`) to census geography. You can also use `latitude`/`longitude` with reverse geocoding to find the FIPS code.

## Tips

- All census tables join on `fips` + `year`. Geography joins on just `fips`.
- To compute poverty rate: `below_poverty_level / poverty_universe`.
- To compute SNAP participation rate: `snap_received / snap_universe`.
- Year 2020 is missing (no ACS 1-Year release due to COVID). Use interpolation if needed.
- ACS 1-Year only covers counties with 65,000+ population (~870 counties). Small rural counties are not included.
- To get state-level totals, group by `state_fips` + `year` and sum the count columns (do NOT sum median/average/ratio columns — recompute those from components).
- The `gini_index` ranges from 0 (perfect equality) to 1 (perfect inequality).
- Income values are in nominal dollars (not inflation-adjusted). To compare across years, adjust using CPI.
- To compute % with no car: `no_vehicle / total_households_vehicles`.
- To compute public transit rate: `public_transit / total_workers`.
- `no_vehicle` is critical for food access — households without cars in areas with few grocery stores are the most food-insecure.
