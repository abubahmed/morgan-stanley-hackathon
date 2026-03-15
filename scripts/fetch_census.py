"""
Fetch US Census data (ACS 1-Year) year-by-year and write normalized CSVs.

Uses the Census Bureau API to pull county-level ACS 1-Year data for each year
from 2014–2023 (skipping 2020 — no 1-Year release due to COVID).

Fetches all counties nationwide per call (county:* without state filter),
resulting in only 45 API calls total (9 years × 5 tables).

Note: ACS 1-Year only covers geographies with 65,000+ population, so small
counties will be absent. This is the tradeoff for getting true annual data.

Output files:
  data/census/demographics.csv   — population by age, sex, race per county per year
  data/census/poverty.csv        — poverty status and food stamp/SNAP participation
  data/census/income.csv         — household income and benefits
  data/census/housing.csv        — housing occupancy, costs, and burden
  data/census/education.csv      — educational attainment
  data/census/geography.csv      — FIPS codes, county/state names

Requires: requests, python-dotenv
Usage:
  python scripts/fetch_census.py                        # uses demo key (limited)
  CENSUS_API_KEY=your_key python scripts/fetch_census.py  # recommended
"""

import csv
import os
import sys
import time
import requests
from dotenv import load_dotenv

load_dotenv(".env.local")

OUTPUT_DIR = "data/census"

# ACS 1-Year: 2014–2023, skipping 2020 (no release due to COVID low response)
YEARS = [2014, 2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023]

# -------------------------------------------------------------------------
# Variable groups — each tuple is (census_var, csv_column_name)
# -------------------------------------------------------------------------

DEMOGRAPHICS_VARS = [
    ("B01001_001E", "total_population"),
    ("B01001_002E", "male_population"),
    ("B01001_026E", "female_population"),
    ("B01002_001E", "median_age"),
    ("B02001_002E", "white_alone"),
    ("B02001_003E", "black_alone"),
    ("B02001_004E", "native_alone"),
    ("B02001_005E", "asian_alone"),
    ("B02001_006E", "pacific_islander_alone"),
    ("B02001_007E", "other_race_alone"),
    ("B02001_008E", "two_or_more_races"),
    ("B03003_003E", "hispanic_or_latino"),
    ("B01001_003E", "male_under_5"),
    ("B01001_004E", "male_5_to_9"),
    ("B01001_005E", "male_10_to_14"),
    ("B01001_006E", "male_15_to_17"),
    ("B01001_020E", "male_65_to_66"),
    ("B01001_021E", "male_67_to_69"),
    ("B01001_022E", "male_70_to_74"),
    ("B01001_023E", "male_75_to_79"),
    ("B01001_024E", "male_80_to_84"),
    ("B01001_025E", "male_85_and_over"),
]

POVERTY_VARS = [
    ("B17001_001E", "poverty_universe"),
    ("B17001_002E", "below_poverty_level"),
    ("B22001_001E", "snap_universe"),
    ("B22001_002E", "snap_received"),
    ("B22001_005E", "snap_not_received"),
    ("B17010_001E", "families_poverty_universe"),
    ("B17010_002E", "families_below_poverty"),
    ("B17020_001E", "poverty_by_age_universe"),
    ("B17020_002E", "poverty_by_age_below"),
    ("C17002_001E", "ratio_income_poverty_universe"),
    ("C17002_002E", "ratio_under_0_50"),
    ("C17002_003E", "ratio_0_50_to_0_99"),
    ("C17002_004E", "ratio_1_00_to_1_24"),
    ("C17002_005E", "ratio_1_25_to_1_49"),
    ("C17002_006E", "ratio_1_50_to_1_84"),
    ("C17002_007E", "ratio_1_85_to_1_99"),
]

INCOME_VARS = [
    ("B19013_001E", "median_household_income"),
    ("B19025_001E", "aggregate_household_income"),
    ("B19001_001E", "hh_income_universe"),
    ("B19001_002E", "hh_income_under_10k"),
    ("B19001_003E", "hh_income_10k_to_15k"),
    ("B19001_004E", "hh_income_15k_to_20k"),
    ("B19001_005E", "hh_income_20k_to_25k"),
    ("B19001_006E", "hh_income_25k_to_30k"),
    ("B19001_007E", "hh_income_30k_to_35k"),
    ("B19001_008E", "hh_income_35k_to_40k"),
    ("B19001_009E", "hh_income_40k_to_45k"),
    ("B19001_010E", "hh_income_45k_to_50k"),
    ("B19001_011E", "hh_income_50k_to_60k"),
    ("B19001_012E", "hh_income_60k_to_75k"),
    ("B19001_013E", "hh_income_75k_to_100k"),
    ("B19001_014E", "hh_income_100k_to_125k"),
    ("B19001_015E", "hh_income_125k_to_150k"),
    ("B19001_016E", "hh_income_150k_to_200k"),
    ("B19001_017E", "hh_income_200k_plus"),
    ("B19301_001E", "per_capita_income"),
    ("B19083_001E", "gini_index"),
]

HOUSING_VARS = [
    ("B25001_001E", "total_housing_units"),
    ("B25002_002E", "occupied_units"),
    ("B25002_003E", "vacant_units"),
    ("B25003_002E", "owner_occupied"),
    ("B25003_003E", "renter_occupied"),
    ("B25077_001E", "median_home_value"),
    ("B25064_001E", "median_gross_rent"),
    ("B25071_001E", "median_rent_pct_income"),
    ("B25106_001E", "housing_cost_universe"),
    ("B25106_002E", "owner_cost_universe"),
    ("B25106_024E", "renter_cost_universe"),
]

EDUCATION_VARS = [
    ("B15003_001E", "edu_universe_25_plus"),
    ("B15003_002E", "no_schooling"),
    ("B15003_017E", "high_school_diploma"),
    ("B15003_018E", "ged"),
    ("B15003_021E", "associates_degree"),
    ("B15003_022E", "bachelors_degree"),
    ("B15003_023E", "masters_degree"),
    ("B15003_024E", "professional_degree"),
    ("B15003_025E", "doctorate_degree"),
]

# Map table name -> var_list
TABLES = {
    "demographics": DEMOGRAPHICS_VARS,
    "poverty": POVERTY_VARS,
    "income": INCOME_VARS,
    "housing": HOUSING_VARS,
    "education": EDUCATION_VARS,
}


def get_api_key() -> str:
    key = os.environ.get("CENSUS_API_KEY", "")
    if not key:
        print("  Warning: No CENSUS_API_KEY set. Using demo key (rate-limited).")
        print("  Get a free key at https://api.census.gov/data/key_signup.html")
    else:
        print(f"  Using API key: {key[:4]}...{key[-4:]}")
    return key


def fetch_all_counties(year: int, var_names: list[str], api_key: str) -> list[list[str]]:
    """Fetch a set of variables for ALL US counties in one call."""
    base_url = f"https://api.census.gov/data/{year}/acs/acs1"
    params = {
        "get": ",".join(["NAME"] + var_names),
        "for": "county:*",
    }
    if api_key:
        params["key"] = api_key

    retries = 3
    for attempt in range(retries):
        try:
            r = requests.get(base_url, params=params, timeout=120)
            if r.status_code in (204, 404):
                return []
            if r.status_code != 200:
                print(f"    HTTP {r.status_code} for {year}: {r.text[:200]}")
                return []
            content_type = r.headers.get("content-type", "")
            if "json" not in content_type and "javascript" not in content_type:
                if attempt < retries - 1:
                    time.sleep(2 ** (attempt + 1))
                    continue
                print(f"    Non-JSON response for {year}: {content_type} — {r.text[:200]}")
                return []
            return r.json()
        except (requests.RequestException, ValueError) as e:
            if attempt < retries - 1:
                wait = 2 ** (attempt + 1)
                print(f"    Retry {attempt + 1} for {year}: {e}")
                time.sleep(wait)
            else:
                print(f"    Failed for {year}: {e}")
                return []


def clean_value(val):
    """Normalize Census API values."""
    if val is None or val == "" or val == "null" or val == "None":
        return ""
    try:
        num = float(val)
        if num < -1:
            return ""
        return val
    except (ValueError, TypeError):
        return str(val).strip()


def main():
    api_key = get_api_key()
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    total_calls = len(YEARS) * len(TABLES)
    print(f"Fetching ACS 1-Year data for {len(YEARS)} years: {YEARS[0]}–{YEARS[-1]} (skipping 2020)")
    print(f"Total API calls: {total_calls} (all counties per call)")
    print(f"Note: ACS 1-Year only covers geographies with 65,000+ population.\n")

    # --- Geography lookup ---
    geo_path = os.path.join(OUTPUT_DIR, "geography.csv")
    geo_file = open(geo_path, "w", newline="", encoding="utf-8")
    geo_writer = csv.DictWriter(geo_file, fieldnames=["state_fips", "county_fips", "fips", "name"])
    geo_writer.writeheader()
    seen_geo = set()

    # Open all CSV files
    files = {}
    writers = {}
    for table_name, var_list in TABLES.items():
        csv_columns = ["year", "fips", "state_fips", "county_fips"] + [v[1] for v in var_list]
        path = os.path.join(OUTPUT_DIR, f"{table_name}.csv")
        f = open(path, "w", newline="", encoding="utf-8")
        w = csv.DictWriter(f, fieldnames=csv_columns)
        w.writeheader()
        files[table_name] = f
        writers[table_name] = w

    total_rows = 0
    call_num = 0

    try:
        for year in YEARS:
            year_rows = 0

            for table_name, var_list in TABLES.items():
                census_vars = [v[0] for v in var_list]
                call_num += 1

                print(f"  [{call_num}/{total_calls}] {year} {table_name}...", end=" ", flush=True)

                data = fetch_all_counties(year, census_vars, api_key)
                if not data or len(data) < 2:
                    print("no data")
                    continue

                header = data[0]
                name_idx = header.index("NAME")
                state_idx = header.index("state")
                county_idx = header.index("county")

                var_indices = {}
                for census_var, col_name in var_list:
                    if census_var in header:
                        var_indices[col_name] = header.index(census_var)

                rows_written = 0
                for row in data[1:]:
                    st = row[state_idx]
                    ct = row[county_idx]
                    fips = f"{st}{ct}"

                    if fips not in seen_geo:
                        seen_geo.add(fips)
                        geo_writer.writerow({
                            "state_fips": st,
                            "county_fips": ct,
                            "fips": fips,
                            "name": row[name_idx],
                        })

                    csv_row = {
                        "year": year,
                        "fips": fips,
                        "state_fips": st,
                        "county_fips": ct,
                    }
                    for col_name, idx in var_indices.items():
                        csv_row[col_name] = clean_value(row[idx])

                    writers[table_name].writerow(csv_row)
                    rows_written += 1

                files[table_name].flush()
                year_rows += rows_written
                print(f"{rows_written} counties")

            total_rows += year_rows
            print(f"  => {year} total: {year_rows} rows\n")

    finally:
        geo_file.close()
        for f in files.values():
            f.close()

    print(f"Done. Wrote {total_rows} total rows for {len(seen_geo)} counties across {len(YEARS)} years.")
    print(f"Output in {OUTPUT_DIR}/:")
    for name in list(TABLES.keys()) + ["geography"]:
        path = os.path.join(OUTPUT_DIR, f"{name}.csv")
        if os.path.exists(path):
            size = os.path.getsize(path)
            print(f"  {name}.csv: {size // 1024} KB")


if __name__ == "__main__":
    main()
