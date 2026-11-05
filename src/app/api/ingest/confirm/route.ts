import { NextRequest, NextResponse } from "next/server";
import { checkIngestAdmin } from "@/lib/ingest/auth";
import { saveImportedCollaboration } from "@/lib/imported-store";
import type { CollabDraft, RawAnnouncement } from "@/lib/ingest/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = checkIngestAdmin(request);
  if (!auth.allowed) return NextResponse.json({ error: auth.message }, { status: auth.status });
  try {
    const body = await request.json() as { raw?: RawAnnouncement; draft?: CollabDraft };
    if (!body.raw || !body.draft) return NextResponse.json({ error: "缺少原始公告或解析草稿" }, { status: 400 });
    const result = await saveImportedCollaboration(body.raw, body.draft);
    return NextResponse.json({ data: result.collaboration, duplicate: result.duplicate });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "入库失败" }, { status: 400 });
  }
}
