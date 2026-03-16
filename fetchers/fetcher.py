"""
Unified data fetcher. Runs one or more data fetchers based on flags.

Usage:
  python fetchers/fetcher.py --all
  python fetchers/fetcher.py --resources --census
  python fetchers/fetcher.py --usda --crosswalk

Flags:
  --all          Run all fetchers
  --resources    Fetch Lemontree food resource data
  --census       Fetch US Census ACS 1-Year data
  --usda         Fetch USDA Food Environment Atlas
  --cdc          Fetch CDC PLACES health data
  --crosswalk    Fetch ZIP-to-county FIPS crosswalk
"""

import sys
import os
import importlib
import time

# Ensure the project root is on the path so "fetchers.xxx" resolves
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

FETCHERS = {
    "resources": "fetchers.resources",
    "census": "fetchers.census",
    "usda": "fetchers.usda",
    "cdc": "fetchers.cdc",
    "crosswalk": "fetchers.crosswalk",
}

RUN_ORDER = ["resources", "census", "usda", "cdc", "crosswalk"]


def main():
    args = set(sys.argv[1:])

    if not args:
        print(__doc__)
        sys.exit(0)

    run_all = "--all" in args
    to_run = []

    for name in RUN_ORDER:
        if run_all or f"--{name}" in args:
            to_run.append(name)

    if not to_run:
        print("No valid flags provided. Use --all or --resources, --census, --usda, --cdc, --crosswalk")
        sys.exit(1)

    print(f"Running fetchers: {', '.join(to_run)}\n")

    for name in to_run:
        module_path = FETCHERS[name]
        print(f"{'='*60}")
        print(f"  {name.upper()}")
        print(f"{'='*60}")

        start = time.time()
        try:
            mod = importlib.import_module(module_path)
            mod.main()
        except Exception as e:
            print(f"  Error in {name}: {e}")
            continue

        elapsed = time.time() - start
        print(f"  Completed in {elapsed:.1f}s\n")

    print("All done.")


if __name__ == "__main__":
    main()
