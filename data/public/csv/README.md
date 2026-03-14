# Clean CSVs — Public datasets + Lemontree (county-level)

All files use **county_fips** (5-digit FIPS) as the join key. See [FIELD_DESCRIPTIONS.md](../FIELD_DESCRIPTIONS.md) for field-by-field descriptions for agent use.

| File | Rows (approx) | Join key |
|------|----------------|----------|
| lemontree_county.csv | 492 | county_fips |
| usda_fara_2019.csv | 40 | county_fips |
| bls_laus_county.csv | 113k+ | county_fips |
| census_acs5_county.csv | 3,144 | county_fips |
| nyc_food_insecurity.csv | 786 | county_fips (derived from local_area_code) |

Regenerate from source JSONs: `npm run export-public-csvs`
