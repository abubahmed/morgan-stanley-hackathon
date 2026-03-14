"""
Find the top 10 resources with the most non-empty fields (within the first 3000)
and save them to data/resources_sample.json.
"""

import heapq
import json
import os
import requests
import sys

BASE_URL = "https://platform.foodhelpline.org"
PAGE_SIZE = 100
MAX_RESOURCES = 3000
TOP_N = 10
OUTPUT_PATH = "data/resources_sample.json"


def fetch_page(cursor: str | None = None) -> dict:
    params = {"take": PAGE_SIZE}
    if cursor:
        params["cursor"] = cursor
    r = requests.get(f"{BASE_URL}/api/resources", params=params, timeout=30)
    r.raise_for_status()
    raw = r.json()
    return raw.get("json", raw)


def count_filled(obj) -> int:
    """Recursively count non-empty fields."""
    score = 0
    if isinstance(obj, dict):
        for v in obj.values():
            score += count_filled(v)
    elif isinstance(obj, list):
        if len(obj) > 0:
            score += 1
            for item in obj:
                score += count_filled(item)
    elif obj is not None and obj != "" and obj != 0 and obj is not False and obj != [] and obj != {}:
        score += 1
    return score


def main():
    print(f"Searching for top {TOP_N} most complete resources (first {MAX_RESOURCES})...")

    # Min-heap of (score, index, resource) — index breaks ties
    heap: list[tuple[int, int, dict]] = []
    cursor = None
    total_checked = 0
    idx = 0

    while total_checked < MAX_RESOURCES:
        page = fetch_page(cursor)
        resources = page.get("resources", [])

        for r in resources:
            score = count_filled(r)
            if len(heap) < TOP_N:
                heapq.heappush(heap, (score, idx, r))
            elif score > heap[0][0]:
                heapq.heapreplace(heap, (score, idx, r))
            idx += 1

        total_checked += len(resources)
        print(f"  Checked {total_checked} resources... (min top-{TOP_N} score: {heap[0][0] if heap else 0})")

        cursor = page.get("cursor")
        if not cursor or not resources:
            break

    if not heap:
        print("No resources found.")
        sys.exit(1)

    # Sort descending by score
    top = sorted(heap, key=lambda x: x[0], reverse=True)

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump([entry[2] for entry in top], f, indent=2)

    print(f"\nTop {TOP_N} resources:")
    for rank, (score, _, r) in enumerate(top, 1):
        print(f"  {rank}. {r.get('name', '?')} (score: {score})")
    print(f"\nSaved to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
