"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, LoaderCircle, Radar, RefreshCw, TriangleAlert } from "lucide-react";
import type { SourceSyncReport } from "@/lib/sources/types";

export function SourceSyncCard({ adminToken }: { adminToken: string }) {
  const [syncing, setSyncing] = useState(false);
  const [reports, setReports] = useState<SourceSyncReport[]>([]);
  const [error, setError] = useState("");

  const sync = async () => {
    setSyncing(true);
    setError("");
    try {
      const response = await fetch("/api/sources/sync", {
        method: "POST",
        headers: adminToken ? { "x-admin-token": adminToken } : {},
      });
      const payload = await response.json() as { data?: { reports: SourceSyncReport[] }; error?: string };
      if (!response.ok) throw new Error(payload.error || "同步失败");
      setReports(payload.data?.reports ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "同步失败");
    } finally {
      setSyncing(false);
    }
  };

  const totals = reports.reduce((sum, report) => ({
    pages: sum.pages + report.pagesScanned,
    newIds: sum.newIds + report.newIdCount,
    candidates: sum.candidates + report.candidates.length,
  }), { pages: 0, newIds: 0, candidates: 0 });

  return (
    <section className="source-sync-card">
      <div className="source-sync-card__icon"><Radar size={20} /></div>
      <div className="source-sync-card__main">
        <span>OFFICIAL SOURCE CONNECTORS</span>
        <h2>游戏官网 · 增量联动监控</h2>
        <p>覆盖原神、崩铁、崩三、绝区零和明日方舟。逐源检查新公告，非餐饮联动与日期不足候选不会自动入库。</p>
      </div>
      <button type="button" onClick={sync} disabled={syncing}>{syncing ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}{syncing ? "正在同步" : "同步全部官方源"}</button>
      {error && <p className="sync-error">{error}</p>}
      {reports.length > 0 && (
        <div className="sync-report">
          <div className="sync-report__stats">
            <span>来源 <b>{reports.length}</b> 个</span>
            <span>扫描 <b>{totals.pages}</b> 页</span>
            <span>新 ID <b>{totals.newIds}</b></span>
            <span>联动候选 <b>{totals.candidates}</b></span>
          </div>
          {reports.map((report) => (
            <div className="sync-report__result" key={report.source}>
              {report.error ? <TriangleAlert size={18} /> : <CheckCircle2 size={18} />}
              <div>
                <strong>{report.ipName}{report.result ? ` · ${report.result.title}` : ""}</strong>
                <p>{report.error ?? (report.result
                  ? `${report.result.duplicate ? "公告已存在" : "已写入联动档案"} · ${report.result.startDate} 至 ${report.result.endDate ?? "结束时间未官宣"}`
                  : `扫描 ${report.pagesScanned} 页，新 ID ${report.newIdCount} 条，候选 ${report.candidates.length} 条；本轮没有新增入库。`)}</p>
              </div>
              {report.result && <Link href={`/ip/${report.source}`}>查看<ArrowRight size={15} /></Link>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
