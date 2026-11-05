import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export function checkIngestAdmin(request: NextRequest) {
  const configured = process.env.INGEST_ADMIN_TOKEN;
  if (!configured) {
    return process.env.NODE_ENV === "production"
      ? { allowed: false, status: 503, message: "生产环境未配置 INGEST_ADMIN_TOKEN，已禁用解析写入接口" }
      : { allowed: true, status: 200, message: "" };
  }
  const supplied = request.headers.get("x-admin-token") ?? "";
  const expectedBuffer = Buffer.from(configured);
  const suppliedBuffer = Buffer.from(supplied);
  const matched = expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
  return matched
    ? { allowed: true, status: 200, message: "" }
    : { allowed: false, status: 401, message: "管理令牌不正确" };
}
