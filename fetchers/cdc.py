"""
Fetch CDC PLACES county-level health data (2023).

Downloads county-level health estimates from the 2025 CDC PLACES release
via the Socrata API. Pivots to wide format with one row per county.

Output: sandbox/data/cdc/health.csv

No API key required.

Usage:
  python fetchers/cdc.py
"""

import csv
import os
import requests
from dotenv import load_dotenv

load_dotenv(".env.local")

OUTPUT_DIR = "sandbox/data/cdc"

SODA_URL = "https://data.cdc.gov/resource/swc5-untb.csv"

KEEP_MEASURES = {
    "DIABETES": "diabetes_pct",
    "OBESITY": "obesity_pct",
    "CHD": "heart_disease_pct",
    "STROKE": "stroke_pct",
    "COPD": "copd_pct",
    "CASTHMA": "asthma_pct",
    "DEPRESSION": "depression_pct",
    "BPHIGH": "high_blood_pressure_pct",
    "HIGHCHOL": "high_cholesterol_pct",
    "MHLTH": "frequent_mental_distress_pct",
    "PHLTH": "frequent_physical_distress_pct",
    "GHLTH": "poor_health_pct",
    "SLEEP": "short_sleep_pct",
    "LPA": "physical_inactivity_pct",
    "CSMOKING": "smoking_pct",
    "BINGE": "binge_drinking_pct",
    "ACCESS2": "no_health_insurance_pct",
    "DISABILITY": "any_disability_pct",
    "FOODINSECU": "food_insecurity_pct",
    "FOODSTAMP": "food_stamp_pct",
    "LACKTRPT": "lack_transportation_pct",
    "HOUSINSECU": "housing_insecurity_pct",
    "LONELINESS": "loneliness_pct",
    "EMOTIONSPT": "lack_social_support_pct",
}

PAGE_SIZE = 50000


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    measure_filter = ",".join(f"'{m}'" for m in KEEP_MEASURES.keys())

    print(f"Downloading CDC PLACES 2023 county health data ({len(KEEP_MEASURES)} measures)...")

    counties: dict[str, dict[str, str]] = {}
    kept = 0
    offset = 0

    while True:
        params = {
            "$where": f"measureid in({measure_filter}) AND year='2023'",
            "$select": "locationid,stateabbr,locationname,measureid,data_value",
            "$limit": PAGE_SIZE,
            "$offset": offset,
        }
        print(f"  Fetching rows {offset}–{offset + PAGE_SIZE}...", end=" ", flush=True)

        r = requests.get(SODA_URL, params=params, timeout=120)
        r.raise_for_status()

        lines = r.text.strip().splitlines()
        if len(lines) <= 1:
            print("done")
            break

        reader = csv.DictReader(lines)
        page_count = 0

        for row in reader:
            measure_id = row.get("measureid", "").strip()
            if measure_id not in KEEP_MEASURES:
                continue

            fips = row.get("locationid", "").strip()
            if not fips or len(fips) != 5:
                continue

            col_name = KEEP_MEASURES[measure_id]
            value = row.get("data_value", "").strip()

            if fips not in counties:
                counties[fips] = {
                    "state": row.get("stateabbr", "").strip(),
                    "county": row.get("locationname", "").strip(),
                }

            # Clean value: strip whitespace, handle nulls and non-numeric
            if not value or value.lower() in ("null", "none", "n/a", "na", ".", "-"):
                value = ""
            else:
                try:
                    float(value)
                except ValueError:
                    value = ""
            counties[fips][col_name] = value
            kept += 1
            page_count += 1

        print(f"{page_count} values")

        if len(lines) - 1 < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    print(f"  Total: {kept} values for {len(counties)} counties")

    col_names = sorted(KEEP_MEASURES.values())
    fieldnames = ["fips", "state", "county"] + col_names

    out_path = os.path.join(OUTPUT_DIR, "health.csv")
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for fips in sorted(counties.keys()):
            row = counties[fips]
            row["fips"] = fips
            writer.writerow(row)

    size_kb = os.path.getsize(out_path) // 1024
    print(f"\nDone. Wrote {len(counties)} counties x {len(col_names)} measures to {out_path} ({size_kb} KB)")


if __name__ == "__main__":
    main()
