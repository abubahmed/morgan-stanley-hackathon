# Insights API (agent contract)

The agent (or any client) should use these endpoints to get **layered** data (Lemontree + public datasets) in a **consistent shape** for visualization.

## GET /api/insights

Returns merged insights by geography (local_area for NYC NTA).

### Query parameters

| Parameter          | Type   | Default   | Description                                      |
|-------------------|--------|-----------|--------------------------------------------------|
| `city`            | string | `nyc`     | City code (e.g. `nyc`)                           |
| `year`            | number | current   | Year for public indicators                       |
| `geo`             | string | `local_area` | `local_area` or `tract` (only local_area used for now) |
| `nta`             | string | -         | Optional: filter to one NTA code                  |
| `minWeightedScore`| number | -         | Optional: only areas with weighted_score >= this  |
| `maxWeightedScore`| number | -         | Optional: only areas with weighted_score <= this  |
| `limit`           | number | -         | Optional: max number of areas to return          |

### Example

```http
GET /api/insights?city=nyc&year=2025&limit=20
```

### Response shape (stable for charts)

```json
{
  "filters": { "city": "nyc", "year": 2025, "geo": "local_area" },
  "areas": [
    {
      "geo": {
        "local_area_code": "MN1201",
        "local_area_name": "Washington Heights (South)",
        "city_code": "nyc"
      },
      "lemontree": {
        "num_pantries": 3,
        "num_with_fresh_produce": 1,
        "num_with_meat": 0,
        "avg_wait_time_min": 15.5,
        "sample_resource_ids": ["id1", "id2"]
      },
      "public": {
        "food_insecure_pct": 0.267,
        "unemployment_rate": 0.141,
        "supply_gap_lbs": 2673103.36,
        "vulnerable_pop": 0.522,
        "weighted_score": 8.91,
        "rank": 1
      }
    }
  ],
  "sources": { "lemontree": true, "publicDatasetIds": ["nyc-food-insecurity"] }
}
```

Use `areas[].public` for context (food insecurity, unemployment, weighted_score). Use `areas[].lemontree` for Lemontree presence (pantries, wait times, tags).

When Census and/or BLS are ingested, each area’s `public` object may also include county-level fields (merged by NTA→county): `population`, `poverty_count`, `poverty_total` (Census ACS), and `unemployment_rate` (BLS LAUS when present). USDA ERS layers, if enabled, can add e.g. `snap_participation_pct`, `wic_authorized_stores`.

---

## GET /api/public-datasets

Lists configured public datasets and cache status.

### Response

```json
{
  "datasets": [
    {
      "id": "nyc-food-insecurity",
      "name": "NYC Food Security Context",
      "provider": "NYC Open Data",
      "baseUrl": "https://data.cityofnewyork.us/resource/4kc9-zrs2.json",
      "format": "socrata_json",
      "geoLevel": "local_area",
      "enabled": true,
      "lastIngestedAt": "2026-03-13T12:00:00.000Z"
    }
  ]
}
```

---

## POST /api/public-datasets

Refreshes cached public data. Body (optional): `{ "datasetId": "nyc-food-insecurity" }`. If `datasetId` is omitted, all enabled datasets are ingested.

### Response

```json
{ "ingested": [{ "id": "nyc-food-insecurity", "rows": 197 }, ...] }
```
