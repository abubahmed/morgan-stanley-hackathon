# ZIP-to-County Crosswalk Reference

You have a crosswalk table that maps US ZIP codes to their primary county FIPS code. Use this to join Lemontree data (which uses `zip_code`) to Census, USDA, and BLS data (which use `fips`).

Each ZIP code is mapped to the single county that contains the largest land area overlap. ZIPs that span multiple counties are assigned to the dominant one.

---

## `zip_county` DataFrame

One row per ZIP code (~33,000 rows).

| Column | Type | Description |
|---|---|---|
| zip_code | string | 5-digit ZIP code, e.g. "10001" |
| fips | string | 5-digit county FIPS (state + county), e.g. "36061" |
| state_fips | string | 2-digit state FIPS, e.g. "36" |
| county_fips | string | 3-digit county FIPS, e.g. "061" |
| county_name | string | Full county name, e.g. "New York County" |

---

## Joining Lemontree to Census/USDA

```python
# Add county FIPS to Lemontree resources
resources_with_county = resources.merge(zip_county, on="zip_code", how="left")

# Then join to any census table
merged = resources_with_county.merge(census_poverty[census_poverty["year"] == 2023], on="fips", how="left")

# Or join to USDA
merged = resources_with_county.merge(usda_food_env, on="fips", how="left")
```

## Tips

- Not all Lemontree ZIP codes will match — some may be missing or malformed. Use `how="left"` to keep all resources.
- The `fips` column is the universal join key across Census, USDA, BLS, and this crosswalk.
- Source: US Census Bureau 2020 ZCTA-to-County relationship file.
