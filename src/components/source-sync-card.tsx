"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, LoaderCircle, Radar, RefreshCw, TriangleAlert } from "lucide-react";
import type { SourceSyncReport } from "@/lib/sources/types";
import type { ChineseFoodWikiReport } from "@/lib/sources/chinesefoodwiki";

export function SourceSyncCard({ adminToken }: { adminToken: string }) {
  const [syncing, setSyncing] = useState(false);
  const [reports, setReports] = useState<SourceSyncReport[]>([]);
  const [wikiReport, setWikiReport] = useState<ChineseFoodWikiReport | null>(null);
  const [error, setError] = useState("");

  const sync = async () => {
    setSyncing(true);
    setError("");
    try {
      const response = await fetch("/api/sources/sync", {
        method: "POST",
        headers: adminToken ? { "x-admin-token": adminToken } : {},
      });
      const payload = await response.json() as { data?: { reports: SourceSyncReport[]; chineseFoodWiki: ChineseFoodWikiReport | null }; error?: string };
      if (!response.ok) throw new Error(payload.error || "同步失败");
      setReports(payload.data?.reports ?? []);
      setWikiReport(payload.data?.chineseFoodWiki ?? null);
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
        <span>OFFICIAL + WIKI CONNECTORS</span>
        <h2>官方源与 Wiki · 增量联动监控</h2>
        <p>覆盖五个游戏官网和 ChineseFoodWiki 饮品时间线。官网按公告 ID 增量；Wiki 按修订和行哈希发现变化，再用 Firecrawl 补全 Sources，无变化时不消耗。</p>
      </div>
      <button type="button" onClick={sync} disabled={syncing}>{syncing ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}{syncing ? "正在同步" : "同步全部信息源"}</button>
      {error && <p className="sync-error">{error}</p>}
      {(reports.length > 0 || wikiReport) && (
        <div className="sync-report">
          <div className="sync-report__stats">
            <span>来源 <b>{reports.length + (wikiReport ? 1 : 0)}</b> 个</span>
            <span>扫描 <b>{totals.pages}</b> 页</span>
            <span>新 ID <b>{totals.newIds}</b></span>
            <span>联动候选 <b>{totals.candidates}</b></span>
            {wikiReport && <span>Wiki 变更行 <b>{wikiReport.changedRows}</b></span>}
          </div>
          {reports.map((report) => (
            <div className="sync-report__result" key={report.source}>
              {report.error ? <TriangleAlert size={18} /> : <CheckCircle2 size={18} />}
              <div>
                <strong>{report.ipName}{report.result ? ` · ${report.result.title}` : ""}</strong>
                <p>{report.error ?? (report.result
                  ? `${report.result.duplicate ? "公告已存在" : "已写入联动档案"} · ${report.result.startDate ?? "开始时间未官宣"} 至 ${report.result.endDate ?? "结束时间未官宣"}`
                  : `扫描 ${report.pagesScanned} 页，新 ID ${report.newIdCount} 条，候选 ${report.candidates.length} 条；本轮没有新增入库。`)}</p>
              </div>
              {report.result && <Link href={`/ip/${report.source}`}>查看<ArrowRight size={15} /></Link>}
            </div>
          ))}
          {wikiReport && (
            <div className="sync-report__result">
              {wikiReport.errors.length ? <TriangleAlert size={18} /> : <CheckCircle2 size={18} />}
              <div>
                <strong>Chinese Food Wiki · 饮品时间线</strong>
                <p>{wikiReport.baseline
                  ? `已建立修订 ${wikiReport.revisionId} 基线，不导入历史；后续只解析变更行。`
                  : `修订 ${wikiReport.previousRevisionId} → ${wikiReport.revisionId}，变更 ${wikiReport.changedRows} 行，来源补全 ${wikiReport.enrichedRows} 行，入库 ${wikiReport.imported.length} 条，跳过 ${wikiReport.skipped.length} 条，失败 ${wikiReport.errors.length} 条；Firecrawl ${wikiReport.firecrawlUsed ? "已调用" : "未调用"}。`}</p>
              </div>
              <a href="https://www.chinesefoodwiki.org/index.php?title=Drink_IP_Collab_Timeline" target="_blank" rel="noreferrer">查看<ArrowRight size={15} /></a>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
