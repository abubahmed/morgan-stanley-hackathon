import { mkdirSync, writeFileSync } from "fs";
import {
  getResources,
  getResourcesByZip,
  searchResources,
  getResourcesOpenToday,
  getMapMarkers,
  getFlyerUrl,
} from "../lib/lemontree_api";

const OUT = "data/lemontree.txt";
mkdirSync("data", { recursive: true });

const lines: string[] = [];

function log(text: string) {
  lines.push(text);
  console.log(text);
}

const lineBreak = "=".repeat(150);

function sample(data: unknown) {
  return JSON.stringify(data, null, 2).split("\n").slice(0, 300).join("\n");
}

async function main() {
  log(lineBreak);
  log("getResources (default)");
  log(lineBreak);
  const resources = await getResources({ take: 2 });
  log(sample(resources));

  log(lineBreak);
  log("getResourcesByZip('10001')");
  log(lineBreak);
  const byZip = await getResourcesByZip("10001", { take: 2 });
  log(sample(byZip));

  log(lineBreak);
  log("searchResources('food bank')");
  log(lineBreak);
  const search = await searchResources("food bank", { take: 2 });
  log(sample(search));

  log(lineBreak);
  log("getResourcesOpenToday");
  log(lineBreak);
  const openToday = await getResourcesOpenToday({ take: 2 });
  log(sample(openToday));

  log(lineBreak);
  log("getMapMarkers (NYC)");
  log(lineBreak);
  const markers = await getMapMarkers([40.7, -74.05], [40.8, -73.9]);
  log(sample(markers));

  log(lineBreak);
  log("getFlyerUrl (NYC)");
  log(lineBreak);
  log(getFlyerUrl(40.7128, -74.006));

  writeFileSync(OUT, lines.join("\n"));
  console.log(`\nSaved to ${OUT}`);
}

main().catch(console.error);
