import { NextRequest, NextResponse } from "next/server";
import { checkIngestAdmin } from "@/lib/ingest/auth";
import { syncOfficialSources } from "@/lib/sources/sync";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const auth = checkIngestAdmin(request);
  if (!auth.allowed) return NextResponse.json({ error: auth.message }, { status: auth.status });
  try {
    const reports = await syncOfficialSources();
    return NextResponse.json({ data: { reports } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "官方来源同步失败" }, { status: 502 });
  }
}
