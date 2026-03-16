import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

const DATA_DIR = path.join(process.cwd(), "data");

function parseCsv(filePath: string): Record<string, string>[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  return Papa.parse<Record<string, string>>(raw, { header: true, skipEmptyLines: true }).data;
}

function filterRows(rows: Record<string, string>[], level: string, fips: string | null): Record<string, string>[] {
  if (level === "national") return rows;
  if (level === "state" && fips) return rows.filter((r) => r.state_fips === fips);
  if (level === "county" && fips) return rows.filter((r) => r.fips === fips);
  return rows;
}

function avgByYear(rows: Record<string, string>[], field: string): Record<string, number> {
  const sums = new Map<string, { total: number; count: number }>();
  for (const row of rows) {
    const year = row.year;
    const val = parseFloat(row[field]);
    if (!year || isNaN(val)) continue;
    const entry = sums.get(year) ?? { total: 0, count: 0 };
    entry.total += val;
    entry.count++;
    sums.set(year, entry);
  }
  const result: Record<string, number> = {};
  for (const [year, { total, count }] of sums) {
    result[year] = Math.round(total / count);
  }
  return result;
}

function rateByYear(rows: Record<string, string>[], numerator: string, denominator: string): Record<string, number> {
  const sums = new Map<string, { num: number; den: number }>();
  for (const row of rows) {
    const year = row.year;
    const num = parseFloat(row[numerator]);
    const den = parseFloat(row[denominator]);
    if (!year || isNaN(num) || isNaN(den) || den === 0) continue;
    const entry = sums.get(year) ?? { num: 0, den: 0 };
    entry.num += num;
    entry.den += den;
    sums.set(year, entry);
  }
  const result: Record<string, number> = {};
  for (const [year, { num, den }] of sums) {
    result[year] = parseFloat(((num / den) * 100).toFixed(1));
  }
  return result;
}

// Build lookups for state/county names from geography.csv
let stateNames: { fips: string; name: string }[] | null = null;
let countyNames: { fips: string; stateFips: string; name: string }[] | null = null;

function loadGeography() {
  if (stateNames) return;
  const geo = parseCsv(path.join(DATA_DIR, "census", "geography.csv"));

  // Extract unique states from county names (e.g. "Cache County, Utah" -> Utah)
  const stateMap = new Map<string, string>();
  const counties: { fips: string; stateFips: string; name: string }[] = [];

  for (const row of geo) {
    const fullName = row.name ?? "";
    counties.push({ fips: row.fips, stateFips: row.state_fips, name: fullName });

    const parts = fullName.split(", ");
    if (parts.length >= 2 && row.state_fips) {
      stateMap.set(row.state_fips, parts[parts.length - 1]);
    }
  }

  stateNames = Array.from(stateMap.entries())
    .map(([fips, name]) => ({ fips, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  countyNames = counties.sort((a, b) => a.name.localeCompare(b.name));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level") ?? "national";
  const fips = searchParams.get("fips");
  const listOnly = searchParams.get("list");

  loadGeography();

  // Return available states or counties for dropdowns
  if (listOnly === "states") {
    return NextResponse.json({ states: stateNames });
  }
  if (listOnly === "counties") {
    const filtered = fips
      ? countyNames!.filter((c) => c.stateFips === fips)
      : countyNames;
    return NextResponse.json({ counties: filtered });
  }

  const incomeRows = filterRows(parseCsv(path.join(DATA_DIR, "census", "income.csv")), level, fips);
  const povertyRows = filterRows(parseCsv(path.join(DATA_DIR, "census", "poverty.csv")), level, fips);
  const commuteRows = filterRows(parseCsv(path.join(DATA_DIR, "census", "commute.csv")), level, fips);

  const medianIncome = avgByYear(incomeRows, "median_household_income");
  const povertyRate = rateByYear(povertyRows, "below_poverty_level", "poverty_universe");
  const snapRate = rateByYear(povertyRows, "snap_received", "snap_universe");
  const transitRate = rateByYear(commuteRows, "public_transit", "total_workers");

  const years = [...new Set([
    ...Object.keys(medianIncome),
    ...Object.keys(povertyRate),
    ...Object.keys(snapRate),
    ...Object.keys(transitRate),
  ])].sort();

  const trends = years.map((year) => ({
    year,
    medianIncome: medianIncome[year] ?? null,
    povertyRate: povertyRate[year] ?? null,
    snapRate: snapRate[year] ?? null,
    transitRate: transitRate[year] ?? null,
  }));

  return NextResponse.json({ trends });
}
