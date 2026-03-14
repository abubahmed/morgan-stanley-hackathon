# Lemontree Data Reference

You have pre-fetched CSV data from the Lemontree food helpline platform loaded into your sandbox. The data covers food pantries, soup kitchens, and SNAP/EBT resources across the platform.

The data is split across 6 CSV files, pre-loaded as pandas DataFrames:

---

## `resources` DataFrame

The main table. One row per food resource (pantry, soup kitchen, etc.).

| Column | Type | Description |
|---|---|---|
| id | string | Unique identifier for the resource |
| name | string | Display name |
| resource_type_id | string | One of: FOOD_PANTRY, SOUP_KITCHEN, SNAP_EBT |
| resource_status_id | string | Status: PUBLISHED, UNAVAILABLE, etc. |
| address_street1 | string | Street address |
| city | string | City name |
| state | string | State name or abbreviation |
| zip_code | string | Zip/postal code |
| latitude | float | Latitude coordinate |
| longitude | float | Longitude coordinate |
| timezone | string | e.g. "America/New_York" |
| confidence | float | Data quality score between 0 and 1 |
| priority | int | Priority ranking |
| rating_average | float | Average user rating (nullable) |
| wait_time_minutes_average | float | Average wait time in minutes (nullable) |
| accepting_new_clients | bool | Whether accepting new clients |
| appointment_required | bool | Whether an appointment is required |
| open_by_appointment | bool | Whether open by appointment only |
| website | string | URL or null |
| usage_limit_count | int | Usage limit per interval (nullable) |
| usage_limit_interval_count | int | Number of intervals (nullable) |
| usage_limit_interval_unit | string | Interval unit e.g. "MONTH" (nullable) |
| usage_limit_calendar_reset | bool | Whether usage limit resets on calendar boundary |
| review_count | int | Number of reviews |
| subscription_count | int | Number of subscribers |
| phones | JSON string | List of phone numbers, e.g. ["(212) 555-1234"] |
| image_urls | JSON string | List of image URLs |
| tag_ids | JSON string | List of tag IDs — look up in `tags` DataFrame |
| region_ids | JSON string | List of region IDs the resource belongs to |
| regions_served_ids | JSON string | List of region IDs the resource serves |
| regional_zip_codes | JSON string | List of zip codes in the resource's service area |

---

## `descriptions` DataFrame

Free-text descriptions for resources, stored separately to keep the main table lightweight. Join to resources via `resource_id`. Only resources with a non-empty description have a row here.

| Column | Type | Description |
|---|---|---|
| resource_id | string | FK to resources.id |
| description | string | Free-text description of what the resource offers |

---

## `shifts` DataFrame

Recurring schedule rules for each resource. One row per shift. Join to resources via `resource_id`.

| Column | Type | Description |
|---|---|---|
| id | string | Unique shift identifier |
| resource_id | string | FK to resources.id |
| appointment_required | bool | Whether this shift requires appointment |
| is_all_day | bool | Whether this is an all-day shift |
| start_time | string | ISO 8601 start time |
| end_time | string | ISO 8601 end time (nullable) |
| duration_minutes | int | Duration in minutes (nullable) |
| recurrence_pattern | string | iCalendar RRULE string describing the recurring schedule (nullable) |
| address | string | Override address for this shift (nullable — use resource address if null) |
| latitude | float | Override latitude (nullable) |
| longitude | float | Override longitude (nullable) |
| location_name | string | Override location name (nullable) |
| resource_type_id | string | Override resource type for this shift (nullable — use resource type if null) |
| tag_ids | JSON string | List of tag IDs for this shift |

---

## `occurrences` DataFrame

Specific scheduled instances of shifts — concrete events on concrete dates. Join to shifts via `shift_id` and to resources via `resource_id`.

| Column | Type | Description |
|---|---|---|
| id | string | Unique occurrence identifier |
| shift_id | string | FK to shifts.id |
| resource_id | string | FK to resources.id |
| address | string | Location for this occurrence |
| appointment_required | bool | Whether this occurrence requires appointment |
| confirmed_at | string | ISO 8601 timestamp when confirmed (nullable) |
| skipped_at | string | ISO 8601 timestamp if cancelled (nullable — non-null means cancelled) |
| start_time | string | ISO 8601 start time |
| end_time | string | ISO 8601 end time |
| title | string | Event title (nullable) |
| description | string | Event description (nullable) |
| latitude | float | Latitude |
| longitude | float | Longitude |
| location_name | string | Location name (nullable) |
| resource_type_id | string | Resource type for this occurrence |
| holidays | JSON string | List of holidays affecting this occurrence |
| tag_ids | JSON string | List of tag IDs |

---

## `tags` DataFrame

Deduplicated lookup table for all tags. Referenced by `tag_ids` columns in resources, shifts, and occurrences.

| Column | Type | Description |
|---|---|---|
| id | string | Unique tag identifier |
| name | string | Tag name, e.g. "ID required", "Halal options", "Spanish spoken" |
| tag_category_id | string | Category: REQUIREMENT, OFFERING, etc. |

To resolve tag names: parse the JSON `tag_ids` column, then filter `tags[tags["id"].isin(tag_id_list)]`.

---

## `flags` DataFrame

Quality/moderation flags on resources. One row per flag. Join to resources via `resource_id`.

| Column | Type | Description |
|---|---|---|
| id | string | Unique flag identifier |
| resource_id | string | FK to resources.id |
| source_id | string | Why flagged: NEW_RESOURCE, REVIEW, OCCURRENCE_HOLIDAY, etc. |
| note | string | Operator note (e.g. "Called: no answer, left voicemail") |
| cleared_at | string | ISO 8601 timestamp when resolved (nullable) |
| abandoned_for_reason | string | Why the flag was abandoned (nullable) |
| postpone_until | string | ISO 8601 timestamp to follow up (nullable) |
| parent_notes | string | Pipe-separated chain of prior notes from flag history |
| proposed_changes | JSON string | List of proposed field changes, e.g. [{"field": "SHIFTS", "value": null}] |

---

## Relationships
## Functions Reference

The following helper functions are pre-loaded in your sandbox environment. These are intentionally minimal so the agent can write custom analysis code when needed.

### How To Choose A Function
- Use `filter_resources` to slice the main dataset.
- Use `filter_occurrences` to slice schedules by time.
- Use `filter_reviews` for feedback analysis (synthetic in sandbox).
- Use `query_resources` for grouped counts and aggregates.
- Use `trend` for time series metrics.
- Use `gap_analysis` to find underserved areas.
- Use `generate_pdf_report` only after you have a report dict and optional image paths.

### `filter_resources(zip=None, region=None, city=None, resource_type=None, status=None, priority_min=None, resource_ids=None)`
Purpose: Flexible filtering across the full `resources` table.

Returns: `pd.DataFrame`

Example:
```python
pantries = filter_resources(resource_type="FOOD_PANTRY", status="PUBLISHED", city="Bronx")
```

### `filter_occurrences(resource_ids=None, date_from=None, date_to=None, include_cancelled=False)`
Purpose: Filter scheduled occurrences by resource and time window.

Returns: `pd.DataFrame`

Example:
```python
events = filter_occurrences(resource_ids=pantries["id"], date_from="2025-01-01", date_to="2025-03-31")
```

### `filter_reviews(resource_ids=None, date_from=None, date_to=None, attended=None, rating_min=None, max_resources=25)`
Purpose: Aggregate and filter synthetic reviews across resources.

Returns: `pd.DataFrame`

Example:
```python
reviews = filter_reviews(resource_ids=pantries["id"], rating_min=3)
```

### `query_resources(filters=None, group_by=None, metrics=None)`
Purpose: General-purpose aggregation for the `resources` DataFrame.

Example:
```python
query_resources(
  filters={"region": "Bronx"},
  group_by=["resource_type_id"],
  metrics={"count": ("id", "count"), "avg_wait": ("wait_time_minutes_average", "mean")}
)
```

### `trend(metric, group_by_time="week", filters=None, per=None, source="reviews")`
Purpose: Time-series trend for review-based metrics.

Example:
```python
trend("wait_time_minutes", group_by_time="month", filters={"rating_min": 3}, per="city")
```

### `gap_analysis(level="city", min_resources=1, filters=None)`
Purpose: Identify underserved areas by minimum resource count.

Example:
```python
gap_analysis(level="zip", min_resources=1)
```

### `fetch_json(url)`
Purpose: Fetch JSON from allowlisted domains only.

Inputs:
- `url` must start with `https://platform.foodhelpline.org/`.

Returns: `dict`

### `load_public_dataset(path_or_url)`
Purpose: Load a dataset from a local path or allowlisted URL.

Returns: `pd.DataFrame`

### `join_on_geo(resources_df, public_df, on="zip_code")`
Purpose: Join Lemontree data with public datasets on a geographic key.

Returns: `pd.DataFrame`

### `generate_pdf_report(report_dict, image_paths=None, title="Lemontree Report")`
Purpose: Create a PDF from a report dict and optional chart images.

Required parameters:
- `report_dict`: a non-empty `dict`
- `title`: non-empty `str`

Optional:
- `image_paths`: list of image file paths (e.g., `/home/user/exports/*.png`)

Returns: `str` path to the PDF in `/home/user/exports`.

```
resources.id  ──<  descriptions.resource_id
resources.id  ──<  shifts.resource_id
resources.id  ──<  occurrences.resource_id
shifts.id     ──<  occurrences.shift_id
resources.id  ──<  flags.resource_id
tags.id       ──   referenced by tag_ids columns (JSON arrays) in resources, shifts, occurrences
```

## Tips

- Use `resources` as first point of reference for most analysis since all other tables are linked to it.
- Parse JSON array columns with `import json; json.loads(row["tag_ids"])` or `df["phones"].apply(json.loads)`.
- To compute distances, use the `geopy` library with `latitude`/`longitude` columns.
- `recurrence_pattern` in shifts is an iCalendar RRULE — use the `dateutil.rrule` module to parse it.
- Filter out cancelled occurrences: `occurrences[occurrences["skipped_at"].isna()]`.
- Resource types: FOOD_PANTRY, SOUP_KITCHEN, SNAP_EBT.
