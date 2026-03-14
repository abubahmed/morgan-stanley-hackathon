import { NextRequest, NextResponse } from "next/server";
import { getResources, searchResources, getResourcesByZip } from "@/lib/lemontree_api";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const text = searchParams.get("text");
  const zip = searchParams.get("zip");
  const take = Number(searchParams.get("take") ?? "10");
  const region = searchParams.get("region") ?? undefined;
  const resourceTypeId = searchParams.get("resourceTypeId") ?? undefined;

  try {
    let data;
    if (text) {
      data = await searchResources(text, { take });
    } else if (zip) {
      data = await getResourcesByZip(zip, { take });
    } else {
      data = await getResources({ take, region, resourceTypeId } as Parameters<typeof getResources>[0]);
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("Lemontree API error:", e);
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
  }
}
