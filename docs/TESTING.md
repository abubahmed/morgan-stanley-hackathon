# Testing the insights data layer

Follow these steps to verify that public dataset ingestion, caching, and the insights API work correctly.

---

## 0. Optional: API keys for Census and BLS

To ingest **Census ACS 5-Year** and **BLS LAUS** (county-level) datasets:

1. Copy `.env.example` to `.env.local`.
2. Get a [Census API key](https://api.census.gov/data/key_signup.html) and a [BLS API key](https://www.bls.gov/developers/registration.htm).
3. Set in `.env.local`:
   - `CENSUS_API_KEY=your_key`
   - `BLS_API_KEY=your_key`

Do **not** commit `.env.local`. Without these keys, only the NYC Food Security dataset (and any other key-free sources) will be ingested.

---

## 1. Ingest public datasets (populate cache)

From the project root (`morgan-stanley-hackathon`):

```bash
npm run ingest-public
```

**Expected:** Console output like:

```
Ingesting 3 enabled dataset(s)...
  Fetching nyc-food-insecurity (NYC Food Security Context)...
  Wrote 786 rows to data/public/nyc-food-insecurity.json
  Fetching census-acs5-county ...
  Wrote 5 rows to data/public/census-acs5-county.json
  ...
Done.
```

If Census or BLS show `Error: CENSUS_API_KEY is not set` (or BLS), add the keys to `.env.local` and run again.

**County-level data and `county_fips`:** Census, BLS, and USDA outputs use a `county_fips` field: a 5-digit code (2-digit state FIPS + 3-digit county FIPS). For NYC, those are 36005 (Bronx), 36047 (Kings/Brooklyn), 36061 (New York/Manhattan), 36081 (Queens), 36085 (Richmond/Staten Island). The insights layer joins these to neighborhoods by mapping NTA → county.

**How public data overlays with LemonTree**

- LemonTree provides food pantries/soup kitchens by location (zip, lat/lng); we aggregate by **NTA** (neighborhood) using `data/geo/zip-to-nta-nyc.json`.
- **NTA-level** (nyc-food-insecurity): food_insecure_pct, weighted_score, supply_gap_lbs, vulnerable_pop → one-to-one with each NTA; high weighted_score = higher need; compare with `num_pantries` / `num_with_fresh_produce` for supply vs need.
- **County-level** (Census, BLS, USDA FARA): population, poverty counts, unemployment_rate, low_access_share → joined to each NTA via county (BX→36005, BK→36047, MN→36061, QN→36081, SI→36085). Use for borough-level context (e.g. poverty rate vs pantry density).

**Troubleshooting: USDA**

- **usda-fea-food-assistance:** Disabled by default (service often returns "MapServer not started"). Set `enabled: true` in the registry when USDA brings the service back up.
- **usda-fara-2019:** Uses public Esri layer (no API key). If you see "Invalid Token", ensure the code does *not* send a token to gisportal.ers.usda.gov. If you see 0 rows, confirm the URL uses `.../MapServer/1` (feature layer), not layer 0 (group).

**Check:** The file `data/public/nyc-food-insecurity.json` exists and contains an array of objects with `year`, `local_area_code`, `local_area_name`, `city_code`, and numeric fields (`food_insecure_pct`, `weighted_score`, etc.).

```bash
head -c 500 data/public/nyc-food-insecurity.json
```

---

## 2. Start the dev server

```bash
npm run dev
```

Leave it running (default: http://localhost:3000).

---

## 3. List public datasets (GET /api/public-datasets)

In another terminal or in a browser:

```bash
curl -s http://localhost:3000/api/public-datasets | jq
```

**Expected:** JSON with `datasets` array containing at least one entry (e.g. `nyc-food-insecurity`) and a `lastIngestedAt` timestamp if you ran ingest.

---

## 4. Get merged insights (GET /api/insights)

**Basic request (NYC, current year, first 5 areas):**

```bash
curl -s "http://localhost:3000/api/insights?city=nyc&year=2025&limit=5" | jq
```

**Expected:** A response with:

- `filters`: `{ "city": "nyc", "year": 2025, "geo": "local_area" }`
- `areas`: array of objects, each with:
  - `geo`: `local_area_code`, `local_area_name`, `city_code`
  - `lemontree`: `num_pantries`, `num_with_fresh_produce`, `num_with_meat`, `avg_wait_time_min`, `sample_resource_ids`
  - `public`: `food_insecure_pct`, `unemployment_rate`, `supply_gap_lbs`, `vulnerable_pop`, `weighted_score`, etc.
- `sources`: `{ "lemontree": true, "publicDatasetIds": ["nyc-food-insecurity"] }`

**Filter by NTA:**

```bash
curl -s "http://localhost:3000/api/insights?city=nyc&year=2025&nta=MN1201" | jq
```

**Expected:** A single area (or empty `areas`) for Washington Heights (South).

**Filter by weighted score (high-need areas):**

```bash
curl -s "http://localhost:3000/api/insights?city=nyc&year=2025&minWeightedScore=7&limit=10" | jq '.areas | length'
```

**Expected:** A number ≤ 10; areas should have `public.weighted_score` ≥ 7.

---

## 5. Refresh cache via API (POST /api/public-datasets)

```bash
curl -s -X POST http://localhost:3000/api/public-datasets \
  -H "Content-Type: application/json" \
  -d '{}' | jq
```

**Expected:** `{ "ingested": [{ "id": "nyc-food-insecurity", "rows": 197 }] }` (or similar row count).

Then call GET /api/public-datasets again; `lastIngestedAt` should be updated.

---

## 6. Sanity checks

- **Public data only:** If the Lemontree API is down or slow, `areas[].lemontree` may be zeros/empty; `areas[].public` should still be filled from cache.
- **Consistent shape:** Every element of `areas` has the same keys (`geo`, `lemontree`, `public`). The agent can rely on this for charts.
- **Docs:** See [docs/agent-api.md](agent-api.md) for the full contract and query parameters.

---

## Quick one-liner test

```bash
npm run ingest-public && npm run dev
```

Then in another terminal:

```bash
curl -s "http://localhost:3000/api/insights?city=nyc&year=2025&limit=1" | jq '.areas[0] | { geo, lemontree: .lemontree.num_pantries, public: .public.weighted_score }'
```

You should see one area with `geo`, `lemontree` (number), and `public` (weighted_score).
