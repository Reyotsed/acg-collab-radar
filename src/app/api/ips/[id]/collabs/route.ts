import { NextRequest, NextResponse } from "next/server";
import { getIpDetail, getIpTimeline } from "@/lib/collabs";
import { DEMO_REFERENCE_DATE } from "@/lib/data";
import { getImportedCollaborations } from "@/lib/imported-store";
import type { Timeline } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const imported = await getImportedCollaborations();
  const detail = getIpDetail(id, imported);
  if (!detail) {
    return NextResponse.json({ error: "IP_NOT_FOUND", message: "未找到该 IP" }, { status: 404 });
  }

  const requestedTimeline = request.nextUrl.searchParams.get("timeline") ?? "all";
  const timeline: Timeline = ["current", "history", "all"].includes(requestedTimeline)
    ? requestedTimeline as Timeline
    : "all";

  return NextResponse.json({
    data: {
      ip: detail.ip,
      collaborations: getIpTimeline(id, timeline, imported),
    },
    meta: {
      timeline,
      referenceDate: DEMO_REFERENCE_DATE,
      demo: true,
    },
  });
}
