import { NextRequest, NextResponse } from "next/server";
import { getRecentIpSummaries } from "@/lib/collabs";
import { DEMO_REFERENCE_DATE } from "@/lib/data";
import { getImportedCollaborations } from "@/lib/imported-store";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const requestedDays = Number(params.get("window_days") ?? 90);
  const windowDays = [30, 90, 365].includes(requestedDays) ? requestedDays : 90;
  const imported = await getImportedCollaborations();
  const data = getRecentIpSummaries({
    q: params.get("q") ?? undefined,
    windowDays,
    category: params.get("category") ?? "all",
    region: params.get("region") ?? "all",
    status: params.get("status") ?? "all",
  }, imported);

  return NextResponse.json({
    data,
    meta: {
      count: data.length,
      referenceDate: DEMO_REFERENCE_DATE,
      demo: true,
      notice: "包含演示快照与人工确认导入记录",
    },
  });
}
