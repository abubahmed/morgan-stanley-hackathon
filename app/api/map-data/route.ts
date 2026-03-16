import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

const DATA_DIR = path.join(process.cwd(), "data");

function parseCsv(filePath: string): Record<string, string>[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  return Papa.parse<Record<string, string>>(raw, { header: true, skipEmptyLines: true }).data;
}

function latestYear(rows: Record<string, string>[]): Record<string, string>[] {
  const byFips = new Map<string, Record<string, string>>();
  for (const row of rows) {
    const fips = row.fips;
    const existing = byFips.get(fips);
    if (!existing || (row.year ?? "") > (existing.year ?? "")) {
      byFips.set(fips, row);
    }
  }
  return Array.from(byFips.values());
}

export async function GET() {
  // 1. Resource points
  const resources = parseCsv(path.join(DATA_DIR, "resources", "resources.csv"));
  const points = resources
    .filter((r) => {
      const lat = parseFloat(r.latitude);
      const lng = parseFloat(r.longitude);
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    })
    .map((r) => ({
      id: r.id,
      name: r.name,
      latitude: parseFloat(r.latitude),
      longitude: parseFloat(r.longitude),
      waitTimeMinutesAverage: r.wait_time_minutes_average ? parseFloat(r.wait_time_minutes_average) : null,
      addressStreet1: r.address_street1 || null,
      city: r.city || null,
      state: r.state || null,
      resourceType: r.resource_type_id,
      rating: r.rating_average ? parseFloat(r.rating_average) : null,
      reviewCount: r.review_count ? parseInt(r.review_count) : 0,
      subscribers: r.subscription_count ? parseInt(r.subscription_count) : 0,
      acceptingNewClients: r.accepting_new_clients === "true",
    }));

  // USDA Food Environment Atlas — 3,100+ counties
  const usda = parseCsv(path.join(DATA_DIR, "usda", "food_environment.csv"));

  // 2. Food insecurity overlay (USDA — state-level values)
  const foodInsecurity: Record<string, string> = {};
  for (const row of usda) {
    const rate = parseFloat(row.food_insecurity_rate);
    if (!isNaN(rate) && row.fips) {
      foodInsecurity[row.fips] = rate > 18 ? "#ef4444" : rate > 12 ? "#f59e0b" : "#3DBFAC";
    }
  }

  // 3. Income overlay (USDA)
  const income: Record<string, string> = {};
  for (const row of usda) {
    const val = parseFloat(row.median_household_income);
    if (!isNaN(val) && row.fips) {
      income[row.fips] = val < 40000 ? "#ef4444" : val < 60000 ? "#f59e0b" : "#3DBFAC";
    }
  }

  // 4. SNAP participation overlay (USDA — values are 0–100%)
  const snap: Record<string, string> = {};
  for (const row of usda) {
    const rate = parseFloat(row.snap_participation_rate);
    if (!isNaN(rate) && rate >= 0 && row.fips) {
      snap[row.fips] = rate > 90 ? "#ef4444" : rate > 75 ? "#f59e0b" : "#3DBFAC";
    }
  }

  // 5. Transit overlay (Census — smaller coverage but only source)
  const commuteRows = latestYear(parseCsv(path.join(DATA_DIR, "census", "commute.csv")));
  const transit: Record<string, string> = {};
  for (const row of commuteRows) {
    const total = parseFloat(row.total_workers);
    const pub = parseFloat(row.public_transit);
    if (!isNaN(total) && !isNaN(pub) && total > 0) {
      const rate = (pub / total) * 100;
      transit[row.fips] = rate > 10 ? "#3DBFAC" : rate > 2 ? "#f59e0b" : "#ef4444";
    }
  }

  return NextResponse.json({
    points,
    overlays: { foodInsecurity, income, snap, transit },
  });
}
