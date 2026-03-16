"""
Fetch ZIP-to-county FIPS crosswalk from US Census Bureau.

Downloads the 2020 ZCTA-to-county relationship file and produces a simple
CSV mapping each ZIP code to its primary county FIPS code (the county with
the largest land area overlap).

Output: data/crosswalk/zip_county.csv

Requires: requests, python-dotenv
Usage:
  python scripts/fetch_crosswalk.py
"""

import csv
import os
import requests
from dotenv import load_dotenv

load_dotenv(".env.local")

OUTPUT_DIR = "sandbox/data/crosswalk"

# Census 2020 ZCTA-to-County relationship file (free, no auth)
CROSSWALK_URL = "https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt"


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("Downloading ZCTA-to-county crosswalk from Census Bureau...")
    r = requests.get(CROSSWALK_URL, timeout=120)
    r.raise_for_status()
    print(f"  Downloaded: {len(r.content) // 1024} KB")

    lines = r.text.strip().splitlines()
    reader = csv.DictReader(lines, delimiter="|")

    # For each ZIP, find the county with the largest land area overlap
    # {zip_code: (county_fips, county_name, max_area)}
    best: dict[str, tuple[str, str, int]] = {}

    row_count = 0
    for row in reader:
        zip_code = row.get("GEOID_ZCTA5_20", "").strip()
        county_fips = row.get("GEOID_COUNTY_20", "").strip()
        county_name = row.get("NAMELSAD_COUNTY_20", "").strip()
        area = int(row.get("AREALAND_PART", "0").strip() or "0")

        if not zip_code or not county_fips:
            continue

        row_count += 1
        if zip_code not in best or area > best[zip_code][2]:
            best[zip_code] = (county_fips, county_name, area)

    print(f"  Parsed {row_count} overlap records")
    print(f"  {len(best)} unique ZIP codes mapped to primary county")

    # Write output
    out_path = os.path.join(OUTPUT_DIR, "zip_county.csv")
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["zip_code", "fips", "state_fips", "county_fips", "county_name"])
        writer.writeheader()

        for zip_code in sorted(best.keys()):
            county_fips_full, county_name, _ = best[zip_code]
            writer.writerow({
                "zip_code": zip_code,
                "fips": county_fips_full,
                "state_fips": county_fips_full[:2],
                "county_fips": county_fips_full[2:],
                "county_name": county_name,
            })

    size_kb = os.path.getsize(out_path) // 1024
    print(f"\nDone. Wrote {len(best)} ZIP-to-county mappings to {out_path} ({size_kb} KB)")


if __name__ == "__main__":
    main()
