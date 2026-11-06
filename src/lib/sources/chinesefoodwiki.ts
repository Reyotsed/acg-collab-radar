import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { getImportedCollaborations, saveImportedCollaboration } from "@/lib/imported-store";
import { ips } from "@/lib/data";
import { extractCollab } from "@/lib/ingest/extract";
import { fetchAnnouncement } from "@/lib/ingest/fetch";
import { fetchPublic } from "@/lib/ingest/http";
import { prepareModelImages } from "@/lib/ingest/images";
import type { RawAnnouncement } from "@/lib/ingest/types";
import type { CollabRegion, Evidence } from "@/lib/types";

const API_URL = "https://www.chinesefoodwiki.org/api.php";
const PAGE_TITLE = "Drink_IP_Collab_Timeline";
const PAGE_URL = `https://www.chinesefoodwiki.org/index.php?title=${PAGE_TITLE}`;
const stateFile = process.env.WIKI_STATE_FILE || path.join(process.env.SOURCE_STATE_DIR || path.join(process.cwd(), "data", "sources"), "chinesefoodwiki.json");

interface WikiRevision {
  revisionId: number;
  parentId: number | null;
  timestamp: string;
  content?: string;
}

interface WikiState {
  source: "chinesefoodwiki";
  revisionId: number | null;
  revisionTimestamp: string | null;
  rows: Record<string, string>;
  pendingRows?: string[];
}

export interface ChineseFoodWikiRow {
  key: string;
  hash: string;
  dateText: string;
  brand: string;
  ipTheme: string;
  circle: string;
  notes: string;
  sources: Evidence[];
  text: string;
}

export interface ChineseFoodWikiReport {
  source: "chinesefoodwiki";
  baseline: boolean;
  manual: boolean;
  enrichedRows: number;
  previousRevisionId: number | null;
  revisionId: number;
  revisionTimestamp: string;
  stateAdvanced: boolean;
  changedRows: number;
  imported: Array<{ rowKey: string; id: string; title: string; duplicate: boolean }>;
  skipped: Array<{ rowKey: string; title: string; reason: string }>;
  errors: Array<{ rowKey: string; title: string; error: string }>;
  firecrawlUsed: boolean;
}

const sha1 = (value: string) => createHash("sha1").update(value).digest("hex");
const plain = (value: string) => value
  .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, "$1")
  .replace(/\[\[([^\]]+)\]\]/g, "$1")
  .replace(/'''?/g, "")
  .trim();
const normalizeKey = (value: string) => plain(value).normalize("NFKC").toLowerCase().replace(/\s+/g, " ");
const normalizeIp = (value: string) => plain(value).normalize("NFKC").toLowerCase().replace(/[\s\-_：:·×'’]/g, "");

function resolveWikiIp(row: ChineseFoodWikiRow) {
  const value = normalizeIp(row.ipTheme);
  const matches = ips.flatMap((ip) => {
    const canonical = [ip.name, ip.nativeName, ip.englishName];
    const aliases = ip.aliases.filter((alias) => normalizeIp(alias).length >= 3);
    return [...canonical, ...aliases]
      .filter((alias) => alias && value.includes(normalizeIp(alias)))
      .map((alias) => ({ ip, length: normalizeIp(alias).length }));
  });
  return matches.sort((a, b) => b.length - a.length)[0]?.ip;
}

export function parseChineseFoodWikiRows(wikitext: string): ChineseFoodWikiRow[] {
  const rows: ChineseFoodWikiRow[] = [];
  for (const table of wikitext.matchAll(/\{\|[\s\S]*?\|\}/g)) {
    for (const chunk of table[0].split(/^\|-/m).slice(1)) {
      if (/^\s*!/m.test(chunk)) continue;
      const markers = [...chunk.matchAll(/^\|(?![}-])(.*)$/gm)];
      if (markers.length !== 6) continue;
      const cells = markers.map((marker, index) => {
        const start = marker.index ?? 0;
        const end = index + 1 < markers.length ? markers[index + 1].index : chunk.length;
        return chunk.slice(start, end).replace(/^\|/, "").replace(/^\|\}\s*$/gm, "").trim();
      });
      const [dateText, brand, ipTheme, circle, notes, sourceText] = cells;
      const sources: Evidence[] = [];
      for (const match of sourceText.matchAll(/\[(https?:\/\/[^\s\]]+)(?:\s+([^\]]+))?\]/g)) {
        const label = plain(match[2] || new URL(match[1]).hostname);
        sources.push({ title: label, source: label, url: match[1], publishedAt: "", tier: "media" });
      }
      const raw = cells.join("\n");
      const key = sha1([dateText, brand, ipTheme].map(normalizeKey).join("|"));
      rows.push({
        key,
        hash: sha1(raw),
        dateText: plain(dateText),
        brand: plain(brand),
        ipTheme: plain(ipTheme),
        circle: plain(circle),
        notes: plain(notes),
        sources,
        text: [
          `Date: ${plain(dateText)}`,
          `Brand: ${plain(brand)}`,
          `IP / Theme: ${plain(ipTheme)}`,
          `Circle: ${plain(circle)}`,
          `Notes: ${plain(notes)}`,
          `Sources: ${sources.map((source) => `${source.title} ${source.url}`).join(" · ") || "未列出"}`,
        ].join("\n"),
      });
    }
  }
  return rows;
}

export function getChineseFoodWikiRegion(row: ChineseFoodWikiRow): CollabRegion | null {
  const region = row.notes.match(/Region:\s*([^.;]+)/i)?.[1] ?? "";
  if (/Taiwan|台湾/i.test(region)) return "中国台湾";
  if (/Hong Kong|香港/i.test(region)) return "中国香港";
  if (/Macau|Macao|澳门/i.test(region)) return "中国澳门";
  if (/Japan|日本|Korea|韩国|Singapore|新加坡/i.test(region)) return null;
  return "中国大陆";
}

async function fetchWikiRevision(withContent: boolean): Promise<WikiRevision> {
  const query = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "revisions",
    titles: PAGE_TITLE,
    rvprop: withContent ? "timestamp|ids|content" : "timestamp|ids",
    rvlimit: "1",
  });
  if (withContent) query.set("rvslots", "main");
  const response = await fetchPublic(`${API_URL}?${query}`);
  if (!response.ok) throw new Error(`ChineseFoodWiki API 返回 ${response.status}`);
  const payload = await response.json() as {
    query?: { pages?: Array<{ revisions?: Array<{ revid: number; parentid?: number; timestamp: string; slots?: { main?: { content?: string } } }> }> };
  };
  const revision = payload.query?.pages?.[0]?.revisions?.[0];
  if (!revision) throw new Error("ChineseFoodWiki 未返回页面修订");
  if (withContent && !revision.slots?.main?.content) throw new Error("ChineseFoodWiki 未返回 wikitext");
  return {
    revisionId: revision.revid,
    parentId: revision.parentid ?? null,
    timestamp: revision.timestamp,
    content: revision.slots?.main?.content,
  };
}

async function loadWikiState(): Promise<WikiState> {
  try {
    return JSON.parse(await readFile(/* turbopackIgnore: true */ stateFile, "utf8")) as WikiState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return { source: "chinesefoodwiki", revisionId: null, revisionTimestamp: null, rows: {} };
  }
}

async function saveWikiState(state: WikiState) {
  await mkdir(/* turbopackIgnore: true */ path.dirname(stateFile), { recursive: true });
  const temporary = `${stateFile}.tmp`;
  await writeFile(/* turbopackIgnore: true */ temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(/* turbopackIgnore: true */ temporary, stateFile);
}

async function rawFromRow(row: ChineseFoodWikiRow, revision: WikiRevision, sourceLimit: number | "all") {
  const publishedAt = revision.timestamp.slice(0, 10);
  const wikiUrl = `${PAGE_URL}&oldid=${revision.revisionId}#collab-${row.key.slice(0, 12)}`;
  const wikiSource: Evidence = {
    title: `ChineseFoodWiki：${row.brand} × ${row.ipTheme}`,
    source: "Chinese Food Wiki",
    url: wikiUrl,
    publishedAt,
    tier: "media",
  };
  const fallback: RawAnnouncement = {
    url: wikiUrl,
    title: `${row.brand} × ${row.ipTheme}`,
    publishedAt,
    sourceName: "Chinese Food Wiki",
    sourceTier: "media",
    fetcher: "mediawiki-api",
    text: row.text,
    images: [],
    relatedSources: row.sources.map((source) => ({ ...source, publishedAt })),
  };

  const selectedSources = (sourceLimit === "all" ? row.sources : row.sources.slice(0, sourceLimit))
    .filter((source, index, all) => all.findIndex((item) => item.url === source.url) === index);
  const fetched: RawAnnouncement[] = [];
  for (const source of selectedSources) {
    try {
      const raw = await fetchAnnouncement(source.url);
      if (raw.text.trim().length >= 80 || raw.images.length) fetched.push(raw);
    } catch {
      // 一个来源失败时继续尝试下一个；全部失败则保留 Wiki 行作为降级证据。
    }
  }
  if (!fetched.length) return { raw: fallback, firecrawlUsed: false, enrichedSources: 0 };

  const [first] = fetched;
  const relatedSources = [
    wikiSource,
    ...row.sources.map((source) => ({ ...source, publishedAt })),
    ...fetched.flatMap((raw) => raw.relatedSources ?? []),
  ].filter((source, index, all) => source.url !== first.url && all.findIndex((item) => item.url === source.url) === index);
  const combinedText = [fallback.text, ...fetched.map((item, index) => `来源 ${index + 1}：${item.url}\n${item.text.slice(0, 12_000)}`)]
    .join("\n\n")
    .slice(0, 45_000);
  const raw: RawAnnouncement = {
    ...first,
    title: first.title || fallback.title,
    publishedAt: first.publishedAt || publishedAt,
    text: combinedText,
    images: fetched.flatMap((item) => item.images),
    relatedSources,
    firecrawlAttempted: fetched.some((item) => item.firecrawlAttempted || item.fetcher === "firecrawl"),
  };
  return {
    raw,
    firecrawlUsed: Boolean(raw.firecrawlAttempted),
    enrichedSources: fetched.length,
  };
}

function rowDate(row: ChineseFoodWikiRow) {
  return row.dateText.match(/\d{4}-\d{2}(?:-\d{2})?/)?.[0] ?? "9999-99";
}

function stableCollaborationId(row: ChineseFoodWikiRow) {
  return `imported-${sha1(`chinesefoodwiki:${row.key}`).slice(0, 12)}`;
}

export async function syncChineseFoodWiki(options: { manual?: boolean; limit?: number | "all"; sourceLimit?: number | "all" } = {}): Promise<ChineseFoodWikiReport> {
  const manual = options.manual ?? false;
  const requestedLimit = options.limit ?? (manual ? "all" : 5);
  const limit = requestedLimit === "all" ? "all" : Math.min(100, Math.max(1, requestedLimit));
  const sourceLimit = options.sourceLimit ?? (manual ? "all" : 2);
  const previous = await loadWikiState();
  if (manual && previous.revisionId === null) throw new Error("请先建立 Wiki 基线，再执行手动补跑");
  const baseline = !manual && previous.revisionId === null;
  let revision = await fetchWikiRevision(baseline || manual);
  if (!manual && !baseline && previous.revisionId === revision.revisionId && !previous.pendingRows?.length) {
    return {
      source: "chinesefoodwiki",
      baseline: false,
      manual,
      enrichedRows: 0,
      previousRevisionId: previous.revisionId,
      revisionId: revision.revisionId,
      revisionTimestamp: revision.timestamp,
      stateAdvanced: true,
      changedRows: 0,
      imported: [],
      skipped: [],
      errors: [],
      firecrawlUsed: false,
    };
  }
  if (!revision.content) revision = await fetchWikiRevision(true);
  const content = revision.content;
  if (!content) throw new Error("ChineseFoodWiki 修订正文为空");

  const currentRows = parseChineseFoodWikiRows(content);
  if (baseline) {
    await saveWikiState({
      source: "chinesefoodwiki",
      revisionId: revision.revisionId,
      revisionTimestamp: revision.timestamp,
      rows: Object.fromEntries(currentRows.map((row) => [row.key, row.hash])),
      pendingRows: [],
    });
    return {
      source: "chinesefoodwiki",
      baseline: true,
      manual,
      enrichedRows: 0,
      previousRevisionId: null,
      revisionId: revision.revisionId,
      revisionTimestamp: revision.timestamp,
      stateAdvanced: true,
      changedRows: 0,
      imported: [],
      skipped: [],
      errors: [],
      firecrawlUsed: false,
    };
  }

  const manualRows = manual ? [...currentRows].sort((a, b) => rowDate(b).localeCompare(rowDate(a))) : [];
  const changedRows = manual
    ? (limit === "all" ? manualRows : manualRows.slice(0, limit))
    : currentRows
      .filter((row) => previous.rows[row.key] !== row.hash || previous.pendingRows?.includes(row.key))
      .sort((a, b) => rowDate(a).localeCompare(rowDate(b)));
  const nextRows = Object.fromEntries(currentRows.map((row) => [row.key, previous.rows[row.key] ?? ""]));
  const nextPending = new Set(previous.pendingRows ?? []);
  const markProcessed = (row: ChineseFoodWikiRow) => {
    nextRows[row.key] = row.hash;
    nextPending.delete(row.key);
  };
  const report: ChineseFoodWikiReport = {
    source: "chinesefoodwiki",
    baseline: false,
    manual,
    enrichedRows: 0,
    previousRevisionId: previous.revisionId,
    revisionId: revision.revisionId,
    revisionTimestamp: revision.timestamp,
    stateAdvanced: false,
    changedRows: changedRows.length,
    imported: [],
    skipped: [],
    errors: [],
    firecrawlUsed: false,
  };

  for (const row of changedRows) {
    const title = `${row.brand} × ${row.ipTheme}`;
    try {
      const region = getChineseFoodWikiRegion(row);
      if (!region) {
        report.skipped.push({ rowKey: row.key, title, reason: "非中国地区活动" });
        markProcessed(row);
        continue;
      }

      const ip = resolveWikiIp(row);
      if (!ip) {
        report.skipped.push({ rowKey: row.key, title, reason: `未收录 IP：${row.ipTheme}` });
        markProcessed(row);
        continue;
      }

      const stableId = stableCollaborationId(row);
      const existing = await getImportedCollaborations();
      const sameRecord = existing.some((item) => item.id === stableId);
      const latest = existing
        .filter((item) => item.id !== stableId && item.ipIds.includes(ip.id))
        .sort((a, b) => (b.startDate ?? b.announcedAt).localeCompare(a.startDate ?? a.announcedAt))[0];
      const rowStart = row.dateText.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
      if (!sameRecord && latest && rowStart && rowStart <= (latest.startDate ?? latest.announcedAt)) {
        report.skipped.push({ rowKey: row.key, title, reason: "不晚于该 IP 当前最新记录" });
        markProcessed(row);
        continue;
      }

      const enrichment = await rawFromRow(row, revision, sourceLimit);
      const raw = enrichment.raw;
      report.firecrawlUsed ||= enrichment.firecrawlUsed;
      if (enrichment.enrichedSources > 0) report.enrichedRows += 1;
      const images = raw.images.length
        ? await prepareModelImages(raw.images)
        : { content: [], tileCount: 0, totalBytes: 0, warnings: [] };
      let draft;
      try {
        draft = await extractCollab(raw, images.content);
      } catch {
        console.warn(`[chinesefoodwiki] ${title} 完整输入解析失败，改用纯文本精简输入重试`);
        draft = await extractCollab({ ...raw, text: raw.text.slice(0, 20_000) }, []);
      }
      draft.ipId = ip.id;
      draft.ipName = ip.name;
      draft.region = region;
      draft.announcedAt = raw.publishedAt;
      if (!draft.isCollab) {
        report.skipped.push({ rowKey: row.key, title, reason: "非餐饮联动" });
        markProcessed(row);
        continue;
      }
      if (!draft.startDate) {
        report.skipped.push({ rowKey: row.key, title, reason: "缺少可比较的活动开始日期" });
        markProcessed(row);
        continue;
      }
      if (draft.endDate && draft.endDate < draft.startDate) {
        report.skipped.push({ rowKey: row.key, title, reason: "活动日期范围无效" });
        markProcessed(row);
        continue;
      }

      if (!sameRecord && latest && draft.startDate <= (latest.startDate ?? latest.announcedAt)) {
        report.skipped.push({ rowKey: row.key, title, reason: "不晚于该 IP 当前最新记录" });
        markProcessed(row);
        continue;
      }

      const saved = await saveImportedCollaboration(raw, draft, {
        latestForIp: draft.ipId,
        stableId: `chinesefoodwiki:${row.key}`,
        updateExisting: true,
      });
      report.imported.push({ rowKey: row.key, id: saved.collaboration.id, title: saved.collaboration.title, duplicate: saved.duplicate });
      markProcessed(row);
    } catch (error) {
      nextPending.add(row.key);
      report.errors.push({ rowKey: row.key, title, error: error instanceof Error ? error.message : "未知解析错误" });
    }
  }

  const pendingRows = [...nextPending].filter((key) => currentRows.some((row) => row.key === key));
  report.stateAdvanced = pendingRows.length === 0;
  await saveWikiState({
    source: "chinesefoodwiki",
    revisionId: report.stateAdvanced ? revision.revisionId : previous.revisionId,
    revisionTimestamp: report.stateAdvanced ? revision.timestamp : previous.revisionTimestamp,
    rows: nextRows,
    pendingRows,
  });
  return report;
}
