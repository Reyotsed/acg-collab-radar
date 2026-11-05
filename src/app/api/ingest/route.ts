import { NextRequest, NextResponse } from "next/server";
import { checkIngestAdmin } from "@/lib/ingest/auth";
import { extractCollab } from "@/lib/ingest/extract";
import { fetchAnnouncement } from "@/lib/ingest/fetch";
import { prepareModelImages } from "@/lib/ingest/images";
import type { IngestResult } from "@/lib/ingest/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const auth = checkIngestAdmin(request);
  if (!auth.allowed) return NextResponse.json({ error: auth.message }, { status: auth.status });

  try {
    const body = await request.json() as { url?: string };
    if (!body.url) return NextResponse.json({ error: "请提供公告 URL" }, { status: 400 });
    const raw = await fetchAnnouncement(body.url);
    const warnings = [...(raw.text.length < 40 ? ["网页正文较少，主要信息可能需要从海报中读取"] : [])];
    const images = raw.images.length ? await prepareModelImages(raw.images) : { content: [], tileCount: 0, totalBytes: 0, warnings: [] };
    warnings.push(...images.warnings);
    const draft = await extractCollab(raw, images.content);
    warnings.push(...draft.warnings);

    const result: IngestResult = {
      raw,
      draft,
      warnings,
      processing: {
        imageCount: raw.images.length,
        imageTiles: images.tileCount,
        model: process.env.DEEPSEEK_MODEL || "deepseek-flash",
      },
    };
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "公告解析失败" }, { status: 502 });
  }
}
