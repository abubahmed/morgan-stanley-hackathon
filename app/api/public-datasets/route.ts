import { NextRequest } from "next/server";
import { getEnabledDatasets, readCached, getCachePath, fetchAndNormalize, writeCached } from "@/lib/public-datasets";
import type { PublicDatasetMeta } from "@/types/insights";
import { existsSync, statSync } from "fs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (type === "data") {
    const foodInsecurityData = readCached("nyc-food-insecurity") || [];
    const resources = foodInsecurityData.map((item) => ({
      id: (item.id as string) || (item.nta_code as string) || Math.random().toString(),
      name: (item.name as string) || (item.local_area_name as string) || "Food Access Point",
      latitude: item.latitude as number | undefined,
      longitude: item.longitude as number | undefined,
      waitTimeMinutesAverage: item.waitTimeMinutesAverage as number | undefined,
      zipCode: (item.zipCode as string) || (item.zip_code as string) || "10001",
    }));
    return Response.json(resources);
  }

  const datasets = getEnabledDatasets();
  const list: PublicDatasetMeta[] = datasets.map((d) => {
    const path = getCachePath(d.id);
    let lastIngestedAt: string | null = null;
    if (existsSync(path)) {
      try {
        const mtime = statSync(path).mtimeMs;
        lastIngestedAt = new Date(mtime).toISOString();
      } catch { /* ignore */ }
    }
    return {
      id: d.id, name: d.name, provider: d.provider, baseUrl: d.baseUrl,
      format: d.format, geoLevel: d.geoLevel, enabled: d.enabled, lastIngestedAt,
    };
  });

  return Response.json({ datasets: list });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const datasetId = body?.datasetId as string | undefined;

  const datasets = getEnabledDatasets();
  const toRun = datasetId ? datasets.filter((d) => d.id === datasetId) : datasets;

  const results: { id: string; rows: number; error?: string }[] = [];
  for (const config of toRun) {
    try {
      const rows = await fetchAndNormalize(config);
      writeCached(config.id, rows);
      results.push({ id: config.id, rows: rows.length });
    } catch (err) {
      results.push({ id: config.id, rows: 0, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return Response.json({ ingested: results });
}
