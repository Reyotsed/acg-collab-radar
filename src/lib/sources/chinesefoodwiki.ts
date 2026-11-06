import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { getImportedCollaborations, saveImportedCollaboration } from "@/lib/imported-store";
import { getIp } from "@/lib/data";
import { extractCollab } from "@/lib/ingest/extract";
import { fetchPublic } from "@/lib/ingest/http";
import type { RawAnnouncement } from "@/lib/ingest/types";
import type { Evidence } from "@/lib/types";

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
  previousRevisionId: number | null;
  revisionId: number;
  revisionTimestamp: string;
  stateAdvanced: boolean;
  changedRows: number;
  imported: Array<{ rowKey: string; id: string; title: string; duplicate: boolean }>;
  skipped: Array<{ rowKey: string; title: string; reason: string }>;
  errors: Array<{ rowKey: string; title: string; error: string }>;
  firecrawlUsed: false;
}

const sha1 = (value: string) => createHash("sha1").update(value).digest("hex");
const plain = (value: string) => value
  .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, "$1")
  .replace(/\[\[([^\]]+)\]\]/g, "$1")
  .replace(/'''?/g, "")
  .trim();
const normalizeKey = (value: string) => plain(value).normalize("NFKC").toLowerCase().replace(/\s+/g, " ");

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

export function isMainlandChineseFoodWikiRow(row: ChineseFoodWikiRow) {
  return !/Region:\s*(Taiwan|Hong Kong|Macau|Macao|台湾|香港|澳门)/i.test(row.notes);
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

function rawFromRow(row: ChineseFoodWikiRow, revision: WikiRevision): RawAnnouncement {
  const publishedAt = revision.timestamp.slice(0, 10);
  return {
    url: `${PAGE_URL}&oldid=${revision.revisionId}#collab-${row.key.slice(0, 12)}`,
    title: `${row.brand} × ${row.ipTheme}`,
    publishedAt,
    sourceName: "Chinese Food Wiki",
    sourceTier: "media",
    fetcher: "mediawiki-api",
    text: row.text,
    images: [],
    relatedSources: row.sources.map((source) => ({ ...source, publishedAt })),
  };
}

function rowDate(row: ChineseFoodWikiRow) {
  return row.dateText.match(/\d{4}-\d{2}(?:-\d{2})?/)?.[0] ?? "9999-99";
}

function stableCollaborationId(row: ChineseFoodWikiRow) {
  return `imported-${sha1(`chinesefoodwiki:${row.key}`).slice(0, 12)}`;
}

export async function syncChineseFoodWiki(): Promise<ChineseFoodWikiReport> {
  const previous = await loadWikiState();
  const baseline = previous.revisionId === null;
  let revision = await fetchWikiRevision(baseline);
  if (!baseline && previous.revisionId === revision.revisionId) {
    return {
      source: "chinesefoodwiki",
      baseline: false,
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
    });
    return {
      source: "chinesefoodwiki",
      baseline: true,
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

  const changedRows = currentRows
    .filter((row) => previous.rows[row.key] !== row.hash)
    .sort((a, b) => rowDate(a).localeCompare(rowDate(b)));
  const nextRows = Object.fromEntries(currentRows.map((row) => [row.key, previous.rows[row.key] ?? ""]));
  const report: ChineseFoodWikiReport = {
    source: "chinesefoodwiki",
    baseline: false,
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
      if (!isMainlandChineseFoodWikiRow(row)) {
        report.skipped.push({ rowKey: row.key, title, reason: "非中国大陆活动" });
        nextRows[row.key] = row.hash;
        continue;
      }

      const raw = rawFromRow(row, revision);
      const draft = await extractCollab(raw, []);
      draft.announcedAt = raw.publishedAt;
      if (!draft.isCollab) {
        report.skipped.push({ rowKey: row.key, title, reason: "非餐饮联动" });
        nextRows[row.key] = row.hash;
        continue;
      }
      if (!getIp(draft.ipId)) {
        report.skipped.push({ rowKey: row.key, title, reason: `未收录 IP：${draft.ipName || row.ipTheme}` });
        nextRows[row.key] = row.hash;
        continue;
      }
      if (!draft.startDate) {
        report.skipped.push({ rowKey: row.key, title, reason: "缺少可比较的活动开始日期" });
        nextRows[row.key] = row.hash;
        continue;
      }
      if (draft.endDate && draft.endDate < draft.startDate) {
        report.skipped.push({ rowKey: row.key, title, reason: "活动日期范围无效" });
        nextRows[row.key] = row.hash;
        continue;
      }

      const stableId = stableCollaborationId(row);
      const existing = await getImportedCollaborations();
      const sameRecord = existing.some((item) => item.id === stableId);
      const latest = existing
        .filter((item) => item.id !== stableId && item.ipIds.includes(draft.ipId))
        .sort((a, b) => (b.startDate ?? b.announcedAt).localeCompare(a.startDate ?? a.announcedAt))[0];
      if (!sameRecord && latest && draft.startDate <= (latest.startDate ?? latest.announcedAt)) {
        report.skipped.push({ rowKey: row.key, title, reason: "不晚于该 IP 当前最新记录" });
        nextRows[row.key] = row.hash;
        continue;
      }

      const saved = await saveImportedCollaboration(raw, draft, {
        latestForIp: draft.ipId,
        stableId: `chinesefoodwiki:${row.key}`,
        updateExisting: true,
      });
      report.imported.push({ rowKey: row.key, id: saved.collaboration.id, title: saved.collaboration.title, duplicate: saved.duplicate });
      nextRows[row.key] = row.hash;
    } catch (error) {
      report.errors.push({ rowKey: row.key, title, error: error instanceof Error ? error.message : "未知解析错误" });
    }
  }

  report.stateAdvanced = report.errors.length === 0;
  await saveWikiState({
    source: "chinesefoodwiki",
    revisionId: report.stateAdvanced ? revision.revisionId : previous.revisionId,
    revisionTimestamp: report.stateAdvanced ? revision.timestamp : previous.revisionTimestamp,
    rows: nextRows,
  });
  return report;
}
