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

## Functions Reference

The following helper functions are pre-loaded in your sandbox environment to facilitate data exploration and analysis.

### `get_resources(**kwargs)`
Fetches food resources by filtering the local `resources` DataFrame.
- **`zip`**: (str) Zip code filter (e.g., "10001"). Alias: `zip_code`.
- **`region`**: (str) Neighborhood name (e.g., "Bronx").
- **`text`**: (str) Search term for names/descriptions.
- **`take`**: (int) Number of records (default: 50).
- **`sort`**: (str) Sort field (e.g., "distance").
- **Returns**: `pd.DataFrame` (id, name, resourceTypeId, zip, distance, etc.)

### `filter_resources(zip=None, region=None, city=None, resource_type=None, status=None, priority_min=None, resource_ids=None)`
Flexible filter over `resources`.
- **Returns**: `pd.DataFrame`

### `filter_occurrences(resource_ids=None, date_from=None, date_to=None, include_cancelled=False)`
Filter occurrences by resource and time window.
- **Returns**: `pd.DataFrame`

### `filter_reviews(resource_ids=None, date_from=None, date_to=None, attended=None, rating_min=None, max_resources=25)`
Aggregate and filter synthetic reviews across resources.
- **Returns**: `pd.DataFrame`

### `get_reviews(resource_id)`
Generates synthetic feedback and reviews for a specific resource.
- **`resource_id`**: (str) Unique ID of the resource.
- **Returns**: `pd.DataFrame` (text, rating, waitTimeMinutes, attended, etc.)

### `get_wait_time_trends(resource_id)`
Analyzes wait time trends over time using synthetic reviews.
- **`resource_id`**: (str) Unique ID of the resource.
- **Returns**: `pd.DataFrame` (week, avg_wait_minutes)

### `wait_time_trends(resource_ids=None, date_from=None, date_to=None, group_by="week")`
Wait time trends for multiple resources.
- **Returns**: `pd.DataFrame` (week/month, avg_wait_minutes)

### `get_neighborhood_stats(region)`
Aggregates resource metrics for a neighborhood.
- **`region`**: (str) Neighborhood name.
- **Returns**: `pd.DataFrame` (resource_count, unqiue_zip_codes grouped by resourceTypeId)

### `categorize_feedback(reviews_df)`
Categorizes free-text reviews into 'Service', 'Food Quality', 'Wait Time', or 'Access/Hours'.
- **`reviews_df`**: (`pd.DataFrame`) A DataFrame with a 'text' column.
- **Returns**: `pd.DataFrame` with an added 'category' column.

### `summarize_feedback(reviews_df)`
Summarize ratings, wait times, attendance, and category counts.
- **Returns**: `dict`

### `extract_key_phrases(reviews_df, top_n=10)`
Simple keyword frequency extraction.
- **Returns**: `dict`

### `sentiment_score(reviews_df)`
Lexicon sentiment score in [-1, 1].
- **Returns**: `float | None`

### `get_service_disruptions()`
Identifies service disruptions by joining 'shifts' and 'occurrences' to find cancelled events.
- **Returns**: `pd.DataFrame` (resource_id, name, skipped_at, address, start_time)

### `disruption_summary(date_from=None, date_to=None)`
Summary counts of disruptions and top affected resources.
- **Returns**: `dict`

### `compute_resource_breakdown(resources_df)`
Groups food resources by their type and calculates the average wait time for each type.
- **`resources_df`**: (`pd.DataFrame`) A DataFrame of resources.
- **Returns**: `dict` containing breakdown and total_resources_analyzed.

### `resource_type_breakdown(zip=None, region=None, city=None, resource_type=None, status=None, priority_min=None)`
Breakdown by type for a filtered slice.
- **Returns**: `dict`

### `filter_active_high_priority(resources_df, min_priority=0)`
Filters the dataset for resources that are currently PUBLISHED and have a priority level at or above the threshold.
- **`resources_df`**: (`pd.DataFrame`) A DataFrame of resources.
- **`min_priority`**: (`int`) Minimum priority score (default: 0).
- **Returns**: `list` of dictionaries with id, name, city, priority.

### `get_neighborhood_coverage(resources_df)`
Analyzes which cities/neighborhoods have the most food assistance coverage versus sparsely populated areas.
- **`resources_df`**: (`pd.DataFrame`) A DataFrame of resources.
- **Returns**: `dict` with most_served_cities, underserved_cities_count, underserved_city_names.

### `coverage_by_area(level="city")`
Coverage counts for city, zip, or region.
- **Returns**: `dict`

### `plot_trend(df, x, y, title="Trend")`
Save a trend plot to `/home/user/exports`.
- **Returns**: `str` path

### `plot_bar(df, x, y, title="Bar Chart")`
Save a bar plot to `/home/user/exports`.
- **Returns**: `str` path

### `plot_map(resources_df)`
Save a lat/long scatter to `/home/user/exports`.
- **Returns**: `str` path

### `generate_partner_report(region=None, date_from=None, date_to=None)`
Generate a lightweight report dict.
- **Returns**: `dict`

### `export_report(report_dict, format="json")`
Export a report to `/home/user/exports`.
- **Returns**: `str` path

### `load_public_dataset(path_or_url)`
Load a dataset from a local path or allowlisted URL.
- **Returns**: `pd.DataFrame`

### `join_on_geo(resources_df, public_df, on="zip_code")`
Join Lemontree data with public datasets.
- **Returns**: `pd.DataFrame`

### `fetch_json(url)`
Generic JSON fetcher for allowlisted domains.
- **`url`**: (str) Full URL (must be `https://platform.foodhelpline.org/...`).
- **Returns**: `dict`

---

## Relationships

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
