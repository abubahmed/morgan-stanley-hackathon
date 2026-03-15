# USDA Food Environment Atlas Reference

You have the USDA Food Environment Atlas loaded as a single pandas DataFrame. This is **NOT a time-series dataset** — it is a static cross-sectional snapshot compiled from various sources spanning roughly 2018–2023, depending on the variable. There is no `year` column. Each variable reflects the most recent available data from its source agency at the time USDA compiled the atlas.

The data covers county-level food access, store availability, food assistance participation, food insecurity, health outcomes, and local food infrastructure.

---

## `usda_food_env` DataFrame

One row per US county (~3,150 counties). Keyed on `fips` (5-digit county FIPS code).

### Identifiers

| Column | Type | Description |
|---|---|---|
| fips | string | 5-digit FIPS code (state + county), e.g. "36061" |
| state | string | 2-letter state abbreviation, e.g. "NY" |
| county | string | County name, e.g. "New York" |

### Food Access / Food Deserts (2019)

| Column | Type | Description |
|---|---|---|
| low_access_pop | float | Population with low access to a store |
| pct_low_access | float | % of population with low access |
| low_access_low_income | float | Low income people with low store access |
| pct_low_access_low_income | float | % low income with low access |
| low_access_no_car_hh | float | Households with no car and low access |
| pct_low_access_no_car | float | % households no car + low access |
| low_access_snap_hh | float | SNAP households with low access |
| pct_low_access_snap | float | % SNAP households with low access |
| low_access_children | float | Children with low store access |
| pct_low_access_children | float | % children with low access |
| low_access_seniors | float | Seniors with low store access |
| pct_low_access_seniors | float | % seniors with low access |

### Store Availability (2020–2023)

| Column | Type | Description |
|---|---|---|
| grocery_stores | int | Grocery store count (2020) |
| grocery_stores_per_1k | float | Grocery stores per 1,000 pop |
| supercenters | int | Supercenter & club store count (2020) |
| supercenters_per_1k | float | Supercenters per 1,000 pop |
| convenience_stores | int | Convenience store count (2020) |
| convenience_stores_per_1k | float | Convenience stores per 1,000 pop |
| specialized_food_stores | int | Specialized food stores (2020) |
| dollar_stores | int | Dollar store count (2020) |
| dollar_stores_per_1k | float | Dollar stores per 1,000 pop |
| snap_authorized_stores | int | SNAP-authorized store count (2023) |
| snap_stores_per_1k | float | SNAP stores per 1,000 pop |
| wic_authorized_stores | int | WIC-authorized store count (2022) |
| wic_stores_per_1k | float | WIC stores per 1,000 pop |

### Restaurants (2020)

| Column | Type | Description |
|---|---|---|
| fast_food_restaurants | int | Fast-food restaurant count |
| fast_food_per_1k | float | Fast-food per 1,000 pop |
| full_service_restaurants | int | Full-service restaurant count |
| full_service_per_1k | float | Full-service per 1,000 pop |

### Food Assistance (2021–2023)

| Column | Type | Description |
|---|---|---|
| pct_snap_participants | float | SNAP participants as % of pop (2022) |
| snap_benefits_per_capita | float | SNAP benefits per capita in dollars (2022) |
| snap_participation_rate | float | SNAP participants as % of eligible pop (2019) |
| snap_redemptions_per_store | float | SNAP redemptions per authorized store in dollars (2023) |
| pct_school_lunch | float | National School Lunch Program participants as % of children (2021) |
| pct_free_lunch_eligible | float | Students eligible for free lunch % (2015) |
| pct_reduced_lunch_eligible | float | Students eligible for reduced-price lunch % (2015) |
| pct_school_breakfast | float | School Breakfast Program participants as % of children (2021) |
| pct_summer_food | float | Summer Food Service Program participants as % of children (2021) |
| pct_wic_participants | float | WIC participants as % of pop (2021) |
| wic_redemptions_per_capita | float | WIC redemptions per capita in dollars (2022) |
| food_banks | int | Food bank count (2021) |

### Food Insecurity (2021–2023 average, state-level)

| Column | Type | Description |
|---|---|---|
| food_insecurity_rate | float | Household food insecurity rate % (3-year avg 2021–23) |
| very_low_food_security_rate | float | Household very low food security rate % (3-year avg 2021–23) |

Note: Food insecurity is measured at the **state level** — all counties in the same state share the same value.

### Health Outcomes (2019–2022)

| Column | Type | Description |
|---|---|---|
| pct_adult_diabetes | float | Adult diabetes rate % (2019) |
| pct_adult_obesity | float | Adult obesity rate % (2022) |

### Local Food (2018–2023)

| Column | Type | Description |
|---|---|---|
| farmers_markets | int | Farmers' market count (2018) |
| farmers_markets_per_1k | float | Farmers' markets per 1,000 pop |
| farmers_markets_accepting_snap | int | Farmers' markets that accept SNAP (2018) |
| pct_farmers_markets_snap | float | % of farmers' markets accepting SNAP |
| food_hubs | int | Food hub count (2023) |
| csa_farms | int | CSA farm count (2023) |

### Socioeconomic (2020–2023)

| Column | Type | Description |
|---|---|---|
| median_household_income | float | Median household income in dollars (2021) |
| poverty_rate | float | Poverty rate % (2021) |
| deep_poverty_rate | float | Deep poverty rate % (income < 50% poverty level, 2021) |
| child_poverty_rate | float | Child poverty rate % (2021) |
| persistent_poverty | string | "1" if persistent-poverty county 2017–21, else "0" |
| metro_nonmetro | string | "1" = metro, "0" = nonmetro (2023) |
| population_loss | string | "1" if population-loss county, else "0" (2015) |
| pct_65_and_older | float | % of population 65+ (2020) |
| pct_under_18 | float | % of population under 18 (2020) |

### Taxes (2014)

| Column | Type | Description |
|---|---|---|
| general_food_sales_tax | float | General food sales tax rate % (2014) |

---

## Missing Values

The value `-9999` is USDA's sentinel for missing/suppressed data. Filter or replace before analysis:
```python
usda_food_env.replace(-9999, pd.NA, inplace=True)
```

## Joining with Other Datasets

Join to census data on `fips`:
```python
merged = census_poverty.merge(usda_food_env, on="fips", how="inner")
```

Note: The USDA `state` column uses 2-letter abbreviations (e.g. "NY") while census uses `state_fips` codes (e.g. "36"). Use `fips` for joins, not state.

## Tips

- This data is best used as a **cross-sectional enrichment layer** — it tells you _where_ food deserts are, what stores exist, and who participates in food programs, but not how those changed over time.
- For time-series analysis, use census and BLS data. Use USDA to add food-specific context.
- Counties with high `pct_low_access` + high `pct_snap_participants` + low `grocery_stores_per_1k` are strong indicators of food desert conditions.
- `food_insecurity_rate` is state-level — don't use it for county-to-county comparisons within the same state.
