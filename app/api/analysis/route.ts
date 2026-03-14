import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/sandbox/agent";

export async function POST(req: NextRequest) {
  try {
    const { job } = await req.json() as { job: string };
    if (!job?.trim()) {
      return NextResponse.json({ error: "Missing job" }, { status: 400 });
    }
    const result = await runAgent(job);
    if (!result) {
      return NextResponse.json({ error: "Agent did not produce a result" }, { status: 500 });
    }
    return NextResponse.json({ result: result.answer });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
