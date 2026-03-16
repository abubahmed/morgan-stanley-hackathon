import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

const DATA_DIR = path.join(process.cwd(), "data");

const TYPE_LABELS: Record<string, string> = {
  FOOD_PANTRY: "Food Pantry",
  SOUP_KITCHEN: "Soup Kitchen",
  SNAP_EBT: "SNAP/EBT",
  COMMUNITY_FRIDGE: "Community Fridge",
  MEAL_DELIVERY: "Meal Delivery",
  OTHER_PUBLIC_BENEFITS: "Public Benefits",
  GROCERY_DELIVERY: "Grocery Delivery",
  OTHER: "Other",
  OTHER_MATERIAL_NEEDS: "Material Needs",
  FINANCIAL_ASSISTANCE: "Financial Aid",
};

function parseCsv(filePath: string): Record<string, string>[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  return Papa.parse<Record<string, string>>(raw, { header: true, skipEmptyLines: true }).data;
}

export async function GET() {
  const resources = parseCsv(path.join(DATA_DIR, "resources", "resources.csv"));

  const MERGE_TO_OTHER = new Set(["FINANCIAL_ASSISTANCE"]);

  const counts: Record<string, number> = {};
  for (const r of resources) {
    const type = (r.resource_type_id ?? "").trim();
    if (!type) continue;
    const key = MERGE_TO_OTHER.has(type) ? "OTHER" : type;
    counts[key] = (counts[key] ?? 0) + 1;
  }

  const result = Object.entries(counts)
    .map(([typeId, count]) => ({
      type: TYPE_LABELS[typeId] ?? typeId,
      resources: count,
    }))
    .sort((a, b) => b.resources - a.resources);

  return NextResponse.json(result);
}
