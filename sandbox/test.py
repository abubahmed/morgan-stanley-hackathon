"""
Local clone of the E2B sandbox environment.
Run this directly to test the data layer: python sandbox/test.py
"""

import requests
import pandas as pd
import json
import time
from datetime import datetime, timezone, timedelta

BASE_URL = "https://platform.foodhelpline.org"

def _fetch(path, params=None):
    params = {k: v for k, v in (params or {}).items() if v is not None}
    print(f"[FETCH] GET {BASE_URL}{path} params={params}")
    start = time.time()
    r = requests.get(BASE_URL + path, params=params, timeout=30)
    elapsed = time.time() - start
    print(f"[FETCH] {r.status_code} in {elapsed:.2f}s ({len(r.content)} bytes)")
    r.raise_for_status()
    raw = r.json()
    return raw.get("json", raw)

def get_resources(**kwargs):
    return _fetch("/api/resources", kwargs)

def get_all_resources(**kwargs):
    all_resources = []
    cursor = None
    while True:
        params = {**kwargs, "take": kwargs.get("take", 40)}
        if cursor:
            params["cursor"] = cursor
        res = get_resources(**params)
        all_resources.extend(res.get("resources", []))
        cursor = res.get("cursor")
        if not cursor:
            break
    return all_resources

def get_resource_by_id(resource_id):
    return _fetch(f"/api/resources/{resource_id}")

def get_resources_near(lat, lng, **kwargs):
    return get_resources(lat=lat, lng=lng, sort="distance", **kwargs)

def get_resources_by_zip(zip_code, **kwargs):
    return get_resources(location=zip_code, **kwargs)

def get_resources_by_region(region, **kwargs):
    return get_resources(region=region, **kwargs)

def search_resources(text, **kwargs):
    return get_resources(text=text, **kwargs)

def get_resources_open_between(start_iso, end_iso, **kwargs):
    return get_resources(occurrencesWithin=f"{start_iso}/{end_iso}", **kwargs)

def get_resources_open_today(**kwargs):
    now = datetime.now(timezone.utc)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = now.replace(hour=23, minute=59, second=59, microsecond=0)
    return get_resources_open_between(start.isoformat(), end.isoformat(), **kwargs)

def get_map_markers(sw_lat, sw_lng, ne_lat, ne_lng):
    url = f"{BASE_URL}/api/resources/markersWithinBounds"
    params = [("corner", f"{sw_lat},{sw_lng}"), ("corner", f"{ne_lat},{ne_lng}")]
    r = requests.get(url, params=params, timeout=30)
    r.raise_for_status()
    return r.json()

def is_open_now(resource):
    now = datetime.now(timezone.utc)
    for occ in (resource.get("occurrences") or []):
        if occ.get("skippedAt"):
            continue
        try:
            start = datetime.fromisoformat(occ["startTime"].replace("Z", "+00:00"))
            end = datetime.fromisoformat(occ["endTime"].replace("Z", "+00:00"))
            if start <= now <= end:
                return True
        except Exception:
            pass
    return False

def get_next_occurrence(resource):
    now = datetime.now(timezone.utc)
    upcoming = []
    for occ in (resource.get("occurrences") or []):
        if occ.get("skippedAt"):
            continue
        try:
            start = datetime.fromisoformat(occ["startTime"].replace("Z", "+00:00"))
            if start > now:
                upcoming.append((start, occ))
        except Exception:
            pass
    if not upcoming:
        return None
    upcoming.sort(key=lambda x: x[0])
    return upcoming[0][1].get("startTime")

def resources_to_df(resources):
    rows = []
    for r in resources:
        addr = r.get("address") or {}
        rows.append({
            "id": r.get("id"),
            "name": r.get("name"),
            "type": r.get("resourceType", {}).get("id"),
            "zip": addr.get("postalCode"),
            "city": addr.get("city"),
            "state": addr.get("state"),
            "lat": r.get("latitude"),
            "lng": r.get("longitude"),
            "verified": r.get("isVerified"),
            "referrals": r.get("referralCount", 0),
            "reviews": r.get("reviewCount", 0),
            "avg_rating": r.get("averageRating"),
            "is_open_now": is_open_now(r),
            "next_open": get_next_occurrence(r),
            "tags": [t.get("id") for t in (r.get("tags") or [])],
            "occurrences_count": len(r.get("occurrences") or []),
        })
    return pd.DataFrame(rows)

def fetch_as_df(**kwargs):
    resources = get_all_resources(**kwargs)
    return resources_to_df(resources)


# ── Run a quick test ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=== Testing data layer locally ===\n")

    print("1) get_resources_by_zip('10001')...")
    result = get_resources_by_zip("10001")
    print(f"   Got {len(result.get('resources', []))} resources\n")
    print("Done.")
