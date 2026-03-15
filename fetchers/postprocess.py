"""
Post-process fetched data: join FIPS codes into resources.csv.

Reads the crosswalk and resources CSVs, adds a `fips` column to resources
based on zip_code lookup, and overwrites resources.csv in place.

Run this AFTER all fetchers have completed.

Usage:
  python fetchers/postprocess.py
"""

import csv
import os
from dotenv import load_dotenv

load_dotenv(".env.local")

RESOURCES_PATH = "sandbox/data/resources/resources.csv"
CROSSWALK_PATH = "sandbox/data/crosswalk/zip_county.csv"


def load_zip_to_fips() -> dict[str, str]:
    """Load zip-to-FIPS mapping from crosswalk CSV."""
    mapping = {}
    if not os.path.exists(CROSSWALK_PATH):
        print(f"  Warning: {CROSSWALK_PATH} not found. Skipping FIPS join.")
        return mapping
    with open(CROSSWALK_PATH, "r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            mapping[row["zip_code"]] = row["fips"]
    print(f"  Loaded {len(mapping)} zip-to-FIPS mappings")
    return mapping


def main():
    print("Post-processing: joining FIPS into resources...")

    if not os.path.exists(RESOURCES_PATH):
        print(f"  Warning: {RESOURCES_PATH} not found. Skipping.")
        return

    zip_to_fips = load_zip_to_fips()
    if not zip_to_fips:
        return

    # Read all resources
    with open(RESOURCES_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        original_fields = reader.fieldnames
        rows = list(reader)

    # Add fips column after zip_code if not already present
    if "fips" in original_fields:
        fields = original_fields
    else:
        fields = []
        for col in original_fields:
            fields.append(col)
            if col == "zip_code":
                fields.append("fips")

    # Join FIPS
    matched = 0
    for row in rows:
        zip_code = (row.get("zip_code") or "").strip()
        fips = zip_to_fips.get(zip_code, "")
        row["fips"] = fips
        if fips:
            matched += 1

    # Write back
    with open(RESOURCES_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)

    print(f"  Joined FIPS for {matched}/{len(rows)} resources ({len(rows) - matched} unmatched)")
    print(f"  Updated {RESOURCES_PATH}")


if __name__ == "__main__":
    main()
