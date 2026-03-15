"""
Fetch USDA Food Environment Atlas data and write a single normalized CSV.

Downloads the Food Environment Atlas CSV zip from the USDA ERS, filters to
only the most relevant variables for food security analysis, and pivots into
a wide-format CSV with one row per county.

Output: data/usda/food_environment.csv  (~3,150 counties × ~70 columns)

Requires: requests, python-dotenv
Usage:
  python scripts/fetch_usda.py
"""

import csv
import os
import sys
import zipfile
import requests
from io import BytesIO
from dotenv import load_dotenv

load_dotenv(".env.local")

OUTPUT_DIR = "data/usda"

ATLAS_CSV_URL = "https://www.ers.usda.gov/media/5570/food-environment-atlas-csv-files.zip?v=96910"

# Curated variable list — most recent year only, no % change columns,
# no redundant breakdowns. Grouped by theme.
# Format: (variable_code, readable_column_name)
KEEP_VARS = {
    # === Food Access / Food Deserts ===
    "LACCESS_POP19": "low_access_pop",
    "PCT_LACCESS_POP19": "pct_low_access",
    "LACCESS_LOWI19": "low_access_low_income",
    "PCT_LACCESS_LOWI19": "pct_low_access_low_income",
    "LACCESS_HHNV19": "low_access_no_car_hh",
    "PCT_LACCESS_HHNV19": "pct_low_access_no_car",
    "LACCESS_SNAP19": "low_access_snap_hh",
    "PCT_LACCESS_SNAP19": "pct_low_access_snap",
    "LACCESS_CHILD19": "low_access_children",
    "PCT_LACCESS_CHILD19": "pct_low_access_children",
    "LACCESS_SENIORS19": "low_access_seniors",
    "PCT_LACCESS_SENIORS19": "pct_low_access_seniors",

    # === Store Availability (most recent) ===
    "GROC20": "grocery_stores",
    "GROCPTH20": "grocery_stores_per_1k",
    "SUPERC20": "supercenters",
    "SUPERCPTH20": "supercenters_per_1k",
    "CONVS20": "convenience_stores",
    "CONVSPTH20": "convenience_stores_per_1k",
    "SPECS20": "specialized_food_stores",
    "DS20": "dollar_stores",
    "DSPTH20": "dollar_stores_per_1k",
    "SNAPS23": "snap_authorized_stores",
    "SNAPSPTH23": "snap_stores_per_1k",
    "WICS22": "wic_authorized_stores",
    "WICSPTH22": "wic_stores_per_1k",

    # === Restaurants ===
    "FFR20": "fast_food_restaurants",
    "FFRPTH20": "fast_food_per_1k",
    "FSR20": "full_service_restaurants",
    "FSRPTH20": "full_service_per_1k",

    # === Food Assistance / SNAP ===
    "PCT_SNAP22": "pct_snap_participants",
    "PC_SNAPBEN22": "snap_benefits_per_capita",
    "SNAP_PART_RATE19": "snap_participation_rate",
    "REDEMP_SNAPS23": "snap_redemptions_per_store",

    # === School Meals ===
    "PCT_NSLP21": "pct_school_lunch",
    "PCT_FREE_LUNCH15": "pct_free_lunch_eligible",
    "PCT_REDUCED_LUNCH15": "pct_reduced_lunch_eligible",
    "PCT_SBP21": "pct_school_breakfast",
    "PCT_SFSP21": "pct_summer_food",

    # === WIC ===
    "PCT_WIC21": "pct_wic_participants",
    "PC_WIC_REDEMP22": "wic_redemptions_per_capita",

    # === Food Banks ===
    "FOOD_BANKS21": "food_banks",

    # === Food Insecurity (state-level, latest) ===
    "FOODINSEC_21_23": "food_insecurity_rate",
    "VLFOODSEC_21_23": "very_low_food_security_rate",

    # === Health ===
    "PCT_DIABETES_ADULTS19": "pct_adult_diabetes",
    "PCT_OBESE_ADULTS22": "pct_adult_obesity",

    # === Local Food ===
    "FMRKT18": "farmers_markets",
    "FMRKTPTH18": "farmers_markets_per_1k",
    "FMRKT_SNAP18": "farmers_markets_accepting_snap",
    "PCT_FMRKT_SNAP18": "pct_farmers_markets_snap",
    "FOODHUB23": "food_hubs",
    "CSA23": "csa_farms",

    # === Socioeconomic ===
    "MEDHHINC21": "median_household_income",
    "POVRATE21": "poverty_rate",
    "DEEPPOVRATE21": "deep_poverty_rate",
    "CHILDPOVRATE21": "child_poverty_rate",
    "PERPOV17_21": "persistent_poverty",
    "METRO23": "metro_nonmetro",
    "POPLOSS15": "population_loss",
    "PCT_65OLDER20": "pct_65_and_older",
    "PCT_18YOUNGER20": "pct_under_18",

    # === Taxes ===
    "FOOD_TAX14": "general_food_sales_tax",
}


def download_atlas() -> bytes:
    """Download the Food Environment Atlas CSV zip."""
    print("Downloading Food Environment Atlas from USDA ERS...")

    r = requests.get(ATLAS_CSV_URL, timeout=120)
    r.raise_for_status()

    size_mb = len(r.content) / (1024 * 1024)
    print(f"  Downloaded: {size_mb:.1f} MB")
    return r.content


def read_csv_from_zip(zf: zipfile.ZipFile, name: str) -> list[dict]:
    """Read a CSV file from a zip archive and return rows as dicts (lowercase keys)."""
    with zf.open(name) as f:
        raw = f.read()

    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            text = raw.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        return []

    reader = csv.DictReader(text.splitlines())
    # Normalize all keys to lowercase
    return [{k.lower(): v for k, v in row.items()} for row in reader]


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    content = download_atlas()
    zf = zipfile.ZipFile(BytesIO(content))
    print(f"Files in zip: {zf.namelist()}\n")

    # Find the data file and variable list
    data_file = None
    var_file = None
    for name in zf.namelist():
        lower = name.lower()
        if "variablelist" in lower and lower.endswith(".csv"):
            var_file = name
        elif lower.endswith(".csv") and "variablelist" not in lower:
            data_file = name

    if not data_file or not var_file:
        print(f"Error: couldn't find data/variable files in zip")
        sys.exit(1)

    # Read variable codebook for reference
    var_rows = read_csv_from_zip(zf, var_file)
    all_var_codes = {row.get("variable_code", "").strip() for row in var_rows}

    # Check which of our desired vars exist
    missing = set(KEEP_VARS.keys()) - all_var_codes
    if missing:
        print(f"  Warning: {len(missing)} variables not found in atlas: {missing}")

    found_vars = {k: v for k, v in KEEP_VARS.items() if k in all_var_codes}
    print(f"  Keeping {len(found_vars)} of {len(all_var_codes)} total variables\n")

    # Read long-format data and pivot
    print("Reading county data...")
    data_rows = read_csv_from_zip(zf, data_file)
    print(f"  {len(data_rows)} total rows")

    # Pivot: {fips: {col_name: value, state: ..., county: ...}}
    counties: dict[str, dict[str, str]] = {}
    kept = 0

    for row in data_rows:
        var_code = row.get("variable_code", "").strip()
        if var_code not in found_vars:
            continue

        fips = row.get("fips", "").strip()
        if not fips:
            continue
        if fips.isdigit() and len(fips) < 5:
            fips = fips.zfill(5)

        if fips not in counties:
            counties[fips] = {
                "state": row.get("state", "").strip(),
                "county": row.get("county", "").strip(),
            }

        col_name = found_vars[var_code]
        value = row.get("value", "").strip()
        # Replace USDA's -9999 sentinel with empty (missing)
        if value == "-9999" or value == "-9999.0":
            value = ""
        counties[fips][col_name] = value
        kept += 1

    zf.close()

    print(f"  Kept {kept} values for {len(counties)} counties")

    # Write single wide-format CSV
    col_names = sorted(found_vars.values())
    fieldnames = ["fips", "state", "county"] + col_names

    out_path = os.path.join(OUTPUT_DIR, "food_environment.csv")
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()

        for fips in sorted(counties.keys()):
            row = counties[fips]
            row["fips"] = fips
            writer.writerow(row)

    size_kb = os.path.getsize(out_path) // 1024
    print(f"\nDone. Wrote {len(counties)} counties × {len(col_names)} variables to {out_path} ({size_kb} KB)")


if __name__ == "__main__":
    main()
