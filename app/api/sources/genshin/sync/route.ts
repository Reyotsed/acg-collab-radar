import { NextRequest, NextResponse } from "next/server";
import { checkIngestAdmin } from "@/lib/ingest/auth";
import { syncLatestGenshinCollab } from "@/lib/sources/genshin";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const auth = checkIngestAdmin(request);
  if (!auth.allowed) return NextResponse.json({ error: auth.message }, { status: auth.status });
  try {
    const report = await syncLatestGenshinCollab();
    return NextResponse.json({ data: report });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "原神官方源同步失败" }, { status: 502 });
  }
}
