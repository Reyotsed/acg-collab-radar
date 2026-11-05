"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, LoaderCircle, Radar, RefreshCw } from "lucide-react";

interface SyncReport {
  pagesScanned: number;
  itemsScanned: number;
  newIdCount: number;
  ignoredCount: number;
  candidates: Array<{ id: string; title: string; page: number; status: "imported" | "rejected" }>;
  result: null | { id: string; title: string; duplicate: boolean; startDate: string | null; endDate: string | null };
  stoppedAt: null | { page: number; id: string; title: string };
}

export function GenshinSyncCard({ adminToken }: { adminToken: string }) {
  const [syncing, setSyncing] = useState(false);
  const [report, setReport] = useState<SyncReport | null>(null);
  const [error, setError] = useState("");

  const sync = async () => {
    setSyncing(true);
    setError("");
    try {
      const response = await fetch("/api/sources/genshin/sync", {
        method: "POST",
        headers: adminToken ? { "x-admin-token": adminToken } : {},
      });
      const payload = await response.json() as { data?: SyncReport; error?: string };
      if (!response.ok) throw new Error(payload.error || "同步失败");
      setReport(payload.data ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "同步失败");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <section className="source-sync-card">
      <div className="source-sync-card__icon"><Radar size={20} /></div>
      <div className="source-sync-card__main">
        <span>OFFICIAL SOURCE CONNECTOR</span>
        <h2>原神官网 · 增量联动监控</h2>
        <p>从最新公告向前检查新 ID，标题命中关键词后再解析，找到最近一条真实餐饮联动即停止。</p>
      </div>
      <button type="button" onClick={sync} disabled={syncing}>{syncing ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}{syncing ? "正在同步" : "同步最近联动"}</button>
      {error && <p className="sync-error">{error}</p>}
      {report && (
        <div className="sync-report">
          <div className="sync-report__stats">
            <span>扫描 <b>{report.pagesScanned}</b> 页</span>
            <span>新 ID <b>{report.newIdCount}</b></span>
            <span>忽略 <b>{report.ignoredCount}</b></span>
            <span>联动候选 <b>{report.candidates.length}</b></span>
          </div>
          {report.result ? (
            <div className="sync-report__result">
              <CheckCircle2 size={18} />
              <div><strong>{report.result.title}</strong><p>{report.result.duplicate ? "公告已存在，已跳过重复创建" : "已解析并写入联动档案"} · {report.result.startDate} 至 {report.result.endDate ?? "结束时间未官宣"}</p></div>
              <Link href="/ip/genshin">查看<ArrowRight size={15} /></Link>
            </div>
          ) : (
            <p className="sync-report__empty"><CheckCircle2 size={16} />没有发现需要处理的新公告，已处理 ID 均已跳过。</p>
          )}
        </div>
      )}
    </section>
  );
}
