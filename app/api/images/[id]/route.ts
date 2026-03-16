import { NextRequest, NextResponse } from "next/server";
import { getImage } from "@/lib/db/images";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const base64 = await getImage(id);
    if (!base64) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const buffer = Buffer.from(base64, "base64");
    return new Response(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid image ID" }, { status: 400 });
  }
}
