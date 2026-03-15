"""
Fetch all resources from the Lemontree API and write normalized CSVs.

Paginates through every page of /api/resources and splits the data into
separate CSV files in data/resources/.

Output files:
  data/resources/resources.csv       — core resource data with simple fields flattened inline
  data/resources/descriptions.csv    — resource descriptions (resource_id, description)
  data/resources/shifts.csv          — one row per shift
  data/resources/occurrences.csv     — one row per occurrence
  data/resources/tags.csv            — deduplicated tag lookup
  data/resources/flags.csv           — one row per flag
"""

import csv
import json
import os
import requests
import sys

BASE_URL = "https://platform.foodhelpline.org"
OUTPUT_DIR = "sandbox/data/resources"
PAGE_SIZE = 100

# ---------------------------------------------------------------------------
# Value normalization
# ---------------------------------------------------------------------------

# Fields that must always be written as strings (never interpreted as numbers)
STRING_FIELDS = {
    "id", "resource_id", "shift_id", "resource_type_id", "resource_status_id",
    "source_id", "tag_category_id", "zip_code",
}

# Fields that should be normalized to lowercase true/false
BOOL_FIELDS = {
    "accepting_new_clients", "appointment_required", "open_by_appointment",
    "usage_limit_calendar_reset", "is_all_day", "managing",
}

# Fields that contain JSON arrays (empty = "[]")
JSON_FIELDS = {
    "phones", "image_urls", "tag_ids", "region_ids", "regions_served_ids",
    "regional_zip_codes", "holidays", "proposed_changes",
}


def clean_row(row: dict) -> dict:
    """Normalize all values in a row before writing to CSV."""
    cleaned = {}
    for key, value in row.items():
        # JSON array fields: ensure [] not ""
        if key in JSON_FIELDS:
            cleaned[key] = value if value else "[]"
            continue

        # Null normalization: None, "None", "null", "" all become ""
        if value is None or value == "None" or value == "null":
            cleaned[key] = ""
            continue

        # Boolean fields: normalize to lowercase true/false
        if key in BOOL_FIELDS:
            if isinstance(value, bool):
                cleaned[key] = "true" if value else "false"
            elif value == "":
                cleaned[key] = ""
            else:
                cleaned[key] = "true" if value else "false"
            continue

        # String ID fields: force to string, strip whitespace
        if key in STRING_FIELDS:
            cleaned[key] = str(value).strip() if value else ""
            continue

        # String fields: strip whitespace
        if isinstance(value, str):
            cleaned[key] = value.strip()
            continue

        # Numbers pass through as-is
        cleaned[key] = value

    return cleaned


# ---------------------------------------------------------------------------
# CSV table definitions
# ---------------------------------------------------------------------------

TABLES = {
    "descriptions": [
        "resource_id",
        "description",
    ],
    "resources": [
        "id",
        "name",
        "resource_type_id",
        "resource_status_id",
        "address_street1",
        "city",
        "state",
        "zip_code",
        "latitude",
        "longitude",
        "timezone",
        "confidence",
        "priority",
        "rating_average",
        "wait_time_minutes_average",
        "accepting_new_clients",
        "appointment_required",
        "open_by_appointment",
        "website",
        "usage_limit_count",
        "usage_limit_interval_count",
        "usage_limit_interval_unit",
        "usage_limit_calendar_reset",
        "review_count",
        "subscription_count",
        # flattened inline (JSON strings for multi-value fields)
        "phones",
        "image_urls",
        "tag_ids",
        "region_ids",
        "regions_served_ids",
        "regional_zip_codes",
    ],
    "shifts": [
        "id",
        "resource_id",
        "appointment_required",
        "is_all_day",
        "start_time",
        "end_time",
        "duration_minutes",
        "recurrence_pattern",
        "address",
        "latitude",
        "longitude",
        "location_name",
        "resource_type_id",
        "tag_ids",
    ],
    "occurrences": [
        "id",
        "shift_id",
        "resource_id",
        "address",
        "appointment_required",
        "confirmed_at",
        "skipped_at",
        "start_time",
        "end_time",
        "title",
        "description",
        "latitude",
        "longitude",
        "location_name",
        "resource_type_id",
        "holidays",
        "tag_ids",
    ],
    "tags": [
        "id",
        "name",
        "tag_category_id",
    ],
    "flags": [
        "id",
        "resource_id",
        "source_id",
        "note",
        "cleared_at",
        "abandoned_for_reason",
        "postpone_until",
        "parent_notes",
        "proposed_changes",
    ],
}


def fetch_page(cursor: str | None = None) -> dict:
    params = {"take": PAGE_SIZE}
    if cursor:
        params["cursor"] = cursor
    r = requests.get(f"{BASE_URL}/api/resources", params=params, timeout=30)
    r.raise_for_status()
    raw = r.json()
    return raw.get("json", raw)


class CleanWriter:
    """Wrapper around csv.DictWriter that normalizes values before writing."""
    def __init__(self, writer: csv.DictWriter):
        self._writer = writer
    def writerow(self, row: dict):
        self._writer.writerow(clean_row(row))
    def writeheader(self):
        self._writer.writeheader()


def collect_parent_notes(flag: dict) -> str:
    """Walk the recursive parent chain and collect all notes."""
    notes = []
    node = flag.get("parent")
    while node:
        note = node.get("note")
        if note:
            notes.append(note)
        node = node.get("parent")
    return " | ".join(notes) if notes else ""


def collect_tags(tags: list, seen_tags: set, tag_writer: CleanWriter) -> str:
    """Write new tags to lookup table, return JSON list of tag IDs."""
    ids = []
    for t in tags or []:
        tid = t.get("id")
        if tid:
            ids.append(tid)
            if tid not in seen_tags:
                seen_tags.add(tid)
                tag_writer.writerow(
                    {
                        "id": tid,
                        "name": t.get("name"),
                        "tag_category_id": t.get("tagCategoryId"),
                    }
                )
    return json.dumps(ids) if ids else "[]"


def process_resource(r: dict, writers: dict[str, CleanWriter], seen_tags: set):
    """Extract one resource into all the CSV writers."""
    rid = r.get("id")
    rt = r.get("resourceType") or {}
    status = r.get("resourceStatus") or {}
    count = r.get("_count") or {}

    # Flatten simple nested arrays inline
    phones = [c.get("phone") for c in (r.get("contacts") or []) if c.get("phone")]
    image_urls = [img.get("url") for img in (r.get("images") or []) if img.get("url")]
    region_ids = [rg.get("id") for rg in (r.get("regions") or []) if rg.get("id")]
    regions_served_ids = [rs.get("id") for rs in (r.get("regionsServed") or []) if rs.get("id")]
    regional_zips = r.get("regionalZipCodes") or []

    # Collect resource-level tags
    tag_ids_str = collect_tags(r.get("tags") or [], seen_tags, writers["tags"])

    # --- descriptions.csv ---
    desc = r.get("description")
    if desc:
        writers["descriptions"].writerow({
            "resource_id": rid,
            "description": desc,
        })

    # --- resources.csv ---
    writers["resources"].writerow(
        {
            "id": rid,
            "name": r.get("name"),
            "resource_type_id": rt.get("id"),
            "resource_status_id": status.get("id"),
            "address_street1": r.get("addressStreet1"),
            "city": r.get("city"),
            "state": r.get("state"),
            "zip_code": r.get("zipCode"),
            "latitude": r.get("latitude"),
            "longitude": r.get("longitude"),
            "timezone": r.get("timezone"),
            "confidence": r.get("confidence"),
            "priority": r.get("priority"),
            "rating_average": r.get("ratingAverage"),
            "wait_time_minutes_average": r.get("waitTimeMinutesAverage"),
            "accepting_new_clients": r.get("acceptingNewClients"),
            "appointment_required": r.get("appointmentRequired"),
            "open_by_appointment": r.get("openByAppointment"),
            "website": r.get("website"),
            "usage_limit_count": r.get("usageLimitCount"),
            "usage_limit_interval_count": r.get("usageLimitIntervalCount"),
            "usage_limit_interval_unit": r.get("usageLimitIntervalUnit"),
            "usage_limit_calendar_reset": r.get("usageLimitCalendarReset"),
            "review_count": count.get("reviews"),
            "subscription_count": count.get("resourceSubscriptions"),
            "phones": json.dumps(phones) if phones else "[]",
            "image_urls": json.dumps(image_urls) if image_urls else "[]",
            "tag_ids": tag_ids_str,
            "region_ids": json.dumps(region_ids) if region_ids else "[]",
            "regions_served_ids": json.dumps(regions_served_ids) if regions_served_ids else "[]",
            "regional_zip_codes": json.dumps(regional_zips) if regional_zips else "[]",
        }
    )

    # --- shifts.csv ---
    for s in r.get("shifts") or []:
        srt = s.get("resourceType") or {}
        stag_ids = collect_tags(s.get("tags") or [], seen_tags, writers["tags"])
        writers["shifts"].writerow(
            {
                "id": s.get("id"),
                "resource_id": rid,
                "appointment_required": s.get("appointmentRequired"),
                "is_all_day": s.get("isAllDay"),
                "start_time": s.get("startTime"),
                "end_time": s.get("endTime"),
                "duration_minutes": s.get("durationMinutes"),
                "recurrence_pattern": s.get("recurrencePattern"),
                "address": s.get("address"),
                "latitude": s.get("latitude"),
                "longitude": s.get("longitude"),
                "location_name": s.get("locationName"),
                "resource_type_id": srt.get("id"),
                "tag_ids": stag_ids,
            }
        )

    # --- occurrences.csv ---
    for o in r.get("occurrences") or []:
        ort = o.get("resourceType") or {}
        otag_ids = collect_tags(o.get("tags") or [], seen_tags, writers["tags"])
        writers["occurrences"].writerow(
            {
                "id": o.get("id"),
                "shift_id": o.get("shiftId"),
                "resource_id": rid,
                "address": o.get("address"),
                "appointment_required": o.get("appointmentRequired"),
                "confirmed_at": o.get("confirmedAt"),
                "skipped_at": o.get("skippedAt"),
                "start_time": o.get("startTime"),
                "end_time": o.get("endTime"),
                "title": o.get("title"),
                "description": o.get("description"),
                "latitude": o.get("latitude"),
                "longitude": o.get("longitude"),
                "location_name": o.get("locationName"),
                "resource_type_id": ort.get("id"),
                "holidays": json.dumps(o.get("holidays") or []),
                "tag_ids": otag_ids,
            }
        )

    # --- flags.csv ---
    for f in r.get("flags") or []:
        changes = f.get("resourceProposedChanges") or []
        changes_str = (
            json.dumps([{"field": pc.get("resourceFlagFieldId"), "value": pc.get("value")} for pc in changes])
            if changes
            else "[]"
        )
        writers["flags"].writerow(
            {
                "id": f.get("id"),
                "resource_id": rid,
                "source_id": f.get("resourceFlagSourceId"),
                "note": f.get("note"),
                "cleared_at": f.get("clearedAt"),
                "abandoned_for_reason": f.get("abandonedForReason"),
                "postpone_until": f.get("postponeUntil"),
                "parent_notes": collect_parent_notes(f),
                "proposed_changes": changes_str,
            }
        )


def main():
    print("Fetching all resources from Lemontree API...")
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Open all CSV files and create writers
    files: dict[str, object] = {}
    writers: dict[str, CleanWriter] = {}
    for name, fields in TABLES.items():
        f = open(os.path.join(OUTPUT_DIR, f"{name}.csv"), "w", newline="", encoding="utf-8")
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        files[name] = f
        writers[name] = CleanWriter(w)

    seen_tags: set[str] = set()
    cursor = None
    page_num = 0
    total_written = 0

    try:
        while True:
            page = fetch_page(cursor)
            resources = page.get("resources", [])
            total = page.get("count", "?")

            for r in resources:
                process_resource(r, writers, seen_tags)

            for f in files.values():
                f.flush()

            total_written += len(resources)
            page_num += 1
            print(f"  Page {page_num}: got {len(resources)} resources ({total_written}/{total} total)")

            cursor = page.get("cursor")
            if not cursor or not resources:
                break
    finally:
        for f in files.values():
            f.close()

    if total_written == 0:
        print("No resources found.")
        sys.exit(1)

    print(f"\nDone. Wrote {total_written} resources across {len(TABLES)} CSV files in {OUTPUT_DIR}/")
    for name in TABLES:
        path = os.path.join(OUTPUT_DIR, f"{name}.csv")
        size = os.path.getsize(path)
        print(f"  {name}.csv: {size // 1024} KB")


if __name__ == "__main__":
    main()
