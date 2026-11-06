"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Database,
  ExternalLink,
  FileImage,
  FileText,
  Image as ImageIcon,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Play,
  ScanText,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { ips } from "@/lib/data";
import { CATEGORY_LABELS } from "@/lib/types";
import type { CollabDraft, IngestResult } from "@/lib/ingest/types";
import { SourceSyncCard } from "./source-sync-card";

const exampleUrl = "https://ys.mihoyo.com/main/news/detail/124755";

export function IngestWorkbench() {
  const [url, setUrl] = useState(exampleUrl);
  const [adminToken, setAdminToken] = useState("");
  const [result, setResult] = useState<IngestResult | null>(null);
  const [draft, setDraft] = useState<CollabDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState("");

  const headers = (json = true): HeadersInit => ({
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(adminToken ? { "x-admin-token": adminToken } : {}),
  });

  const analyze = async () => {
    setLoading(true);
    setError("");
    setSavedId("");
    try {
      const response = await fetch("/api/ingest", { method: "POST", headers: headers(), body: JSON.stringify({ url }) });
      const payload = await response.json() as IngestResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || "解析失败");
      setResult(payload);
      setDraft(payload.draft);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "解析失败，请稍后重试");
      setResult(null);
      setDraft(null);
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = <K extends keyof CollabDraft>(key: K, value: CollabDraft[K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  };

  const confirm = async () => {
    if (!result || !draft) return;
    setConfirming(true);
    setError("");
    try {
      const response = await fetch("/api/ingest/confirm", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ raw: result.raw, draft }),
      });
      const payload = await response.json() as { data?: { id: string }; error?: string };
      if (!response.ok) throw new Error(payload.error || "入库失败");
      setSavedId(payload.data?.id ?? "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "入库失败");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="ingest-shell container">
      <section className="ingest-heading">
        <div className="eyebrow"><ScanText size={15} /> DATA PIPELINE LAB</div>
        <h1>把一条公告，变成<span>结构化联动</span></h1>
        <p>抓取官网正文和海报，DeepSeek 多模态理解内容，再由你确认入库。</p>
        <div className="pipeline-steps">
          <span><Link2 size={16} /><b>01</b>获取公告</span><ArrowRight size={15} />
          <span><Sparkles size={16} /><b>02</b>多模态解析</span><ArrowRight size={15} />
          <span><ShieldCheck size={16} /><b>03</b>人工确认</span>
        </div>
      </section>

      <section className="ingest-url-card">
        <form onSubmit={(event) => { event.preventDefault(); void analyze(); }}>
          <label htmlFor="announcement-url">公告链接</label>
          <div className="ingest-url-input">
            <Link2 size={20} />
            <input id="announcement-url" type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="粘贴品牌或 IP 官方公告 URL" />
            <button type="submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : <Play size={17} />}{loading ? "正在解析" : "抓取并解析"}</button>
          </div>
        </form>
        <div className="ingest-url-meta">
          <button type="button" onClick={() => setUrl(exampleUrl)}>载入原神 × 肯德基示例</button>
          <span>真实请求通常需要 1～3 分钟</span>
        </div>
        <details className="admin-token">
          <summary><LockKeyhole size={13} />部署管理令牌<ChevronDown size={13} /></summary>
          <input type="password" value={adminToken} onChange={(event) => setAdminToken(event.target.value)} placeholder="本地开发可留空；生产环境填写 INGEST_ADMIN_TOKEN" autoComplete="off" />
        </details>
      </section>

      <SourceSyncCard adminToken={adminToken} />

      {error && <div className="ingest-alert ingest-alert--error"><TriangleAlert size={18} /><div><strong>这次没有解析成功</strong><p>{error}</p></div></div>}
      {loading && (
        <div className="ingest-loading">
          <LoaderCircle className="spin" size={25} />
          <div><strong>正在阅读公告与海报</strong><p>获取正文、处理长图并调用多模态模型。图片较多时请稍等，不要重复提交。</p></div>
        </div>
      )}

      {result && draft && !loading && (
        <>
          <div className="processing-strip">
            <span><Database size={14} />{result.raw.fetcher}</span>
            <span><FileImage size={14} />{result.processing.imageCount} 张原图</span>
            <span><ImageIcon size={14} />{result.processing.imageTiles} 张模型切片</span>
            <span><Sparkles size={14} />{result.processing.model}</span>
            <span className="confidence">置信度 {Math.round(draft.confidence * 100)}%</span>
          </div>
          {result.warnings.length > 0 && <div className="ingest-alert"><TriangleAlert size={17} /><div><strong>需要人工留意</strong>{result.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div></div>}

          <div className="ingest-grid">
            <section className="raw-panel">
              <div className="panel-heading"><div><span>RAW DOCUMENT</span><h2>原始公告</h2></div><a href={result.raw.url} target="_blank" rel="noreferrer">查看原文<ExternalLink size={14} /></a></div>
              <div className="raw-source"><span className={`evidence-tier evidence-tier--${result.raw.sourceTier}`}>{result.raw.sourceTier === "official" ? "官方" : "媒体"}</span><strong>{result.raw.sourceName}</strong><span>{result.raw.publishedAt}</span></div>
              <h3 className="raw-title">{result.raw.title}</h3>
              <div className="raw-text"><FileText size={16} /><p>{result.raw.text || "正文为空，主要信息位于海报图片。"}</p></div>
              <div className="raw-images-heading"><ImageIcon size={15} />公告图片 <span>{result.raw.images.length}</span></div>
              <div className="raw-images">
                {result.raw.images.map((image, index) => (
                  <a href={image} target="_blank" rel="noreferrer" key={image} title={`查看第 ${index + 1} 张原图`}>
                    <img src={image} alt={`公告第 ${index + 1} 张海报`} loading="lazy" />
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  </a>
                ))}
              </div>
            </section>

            <section className="draft-panel">
              <div className="panel-heading"><div><span>STRUCTURED DRAFT</span><h2>确认解析结果</h2></div><span className="editable-badge">可编辑</span></div>
              <div className="draft-form">
                <label>归属 IP<select value={draft.ipId} onChange={(event) => updateDraft("ipId", event.target.value)} required><option value="">请选择 IP</option>{ips.map((ip) => <option value={ip.id} key={ip.id}>{ip.name} · {ip.englishName}</option>)}</select></label>
                <label className="field-full">联动标题<input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} required /></label>
                <label>合作品牌<input value={draft.brand} onChange={(event) => updateDraft("brand", event.target.value)} required /></label>
                <label>联动类型<select value={draft.category} onChange={(event) => updateDraft("category", event.target.value as CollabDraft["category"])}>{Object.entries(CATEGORY_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                <label>地区<select value={draft.region} onChange={(event) => updateDraft("region", event.target.value as CollabDraft["region"])}><option>中国大陆</option><option>中国台湾</option><option>中国香港</option><option>中国澳门</option><option>日本</option></select></label>
                <label>公告日期<input type="date" value={draft.announcedAt} onChange={(event) => updateDraft("announcedAt", event.target.value)} required /></label>
                <label>开始日期<input type="date" value={draft.startDate ?? ""} onChange={(event) => updateDraft("startDate", event.target.value || null)} required /></label>
                <label>结束日期<span className="label-note">未官宣可留空</span><input type="date" value={draft.endDate ?? ""} onChange={(event) => updateDraft("endDate", event.target.value || null)} /></label>
                <label className="field-full">地点与门店<textarea rows={2} value={draft.location} onChange={(event) => updateDraft("location", event.target.value)} /></label>
                <label className="field-full">联动摘要<textarea rows={6} value={draft.summary} onChange={(event) => updateDraft("summary", event.target.value)} /></label>
                <label className="field-full">标签<span className="label-note">使用逗号分隔</span><input value={draft.tags.join("，")} onChange={(event) => updateDraft("tags", event.target.value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))} /></label>
              </div>
              {draft.evidenceQuotes.length > 0 && <div className="draft-evidence"><strong><ShieldCheck size={14} />模型摘录的原文证据</strong>{draft.evidenceQuotes.map((quote) => <blockquote key={quote}>“{quote}”</blockquote>)}</div>}
              <button type="button" className="confirm-button" onClick={confirm} disabled={confirming || !draft.ipId || !draft.startDate}>{confirming ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}{confirming ? "正在入库" : "确认并写入联动记录"}</button>
              <p className="confirm-note">入库后可在这个 IP 的历史联动中查看；同一 URL 不会重复创建。</p>
            </section>
          </div>
        </>
      )}

      {savedId && draft && (
        <div className="ingest-success"><CheckCircle2 size={23} /><div><strong>这条联动已保存</strong><p>原神官网公告已进入「{draft.ipName}」的联动档案。</p></div><Link href={`/ip/${draft.ipId}`}>查看 IP 联动记录<ArrowRight size={16} /></Link></div>
      )}
    </div>
  );
}
