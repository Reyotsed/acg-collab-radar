import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { ips } from "@/lib/data";
import { saveImportedCollaboration } from "@/lib/imported-store";
import { extractCollab } from "@/lib/ingest/extract";
import { fetchAnnouncement } from "@/lib/ingest/fetch";
import { fetchPublic } from "@/lib/ingest/http";
import { prepareModelImages } from "@/lib/ingest/images";
import { getOfficialSourceByHostname } from "./registry";
import { isWithinSyncWindow } from "./sync";

const SEARCH_URL = "https://api.firecrawl.dev/v2/search";
const SEARCH_INTERVAL_MS = 20 * 60 * 60 * 1000;
const MAX_DAILY_SCRAPES = 5;
const stateFile = process.env.WEB_DISCOVERY_STATE_FILE || path.join(process.env.SOURCE_STATE_DIR || path.join(process.cwd(), "data", "sources"), "web-discovery.json");
const collabPattern = /联动|联名|合作/i;
const foodPattern = /餐饮|奶茶|咖啡|茶饮|饮品|快餐|套餐|肯德基|麦当劳|必胜客|汉堡王|瑞幸|喜茶|奈雪|茶百道|古茗|蜜雪|星巴克|库迪|霸王茶姬/i;

export const discoveryQueries = [
  { query: "(游戏 OR 动漫) (联动 OR 联名) (餐饮 OR 奶茶 OR 咖啡 OR 快餐)" },
  { query: "(肯德基 OR 麦当劳 OR 必胜客 OR 汉堡王) (联动 OR 联名) (游戏 OR 动漫)" },
  {
    query: "(游戏 OR 动漫) (联动 OR 联名)",
    includeDomains: ["socialbeta.com", "foodaily.com", "digitaling.com", "4anet.com", "sina.cn"],
  },
] as const;

interface SearchItem {
  url: string;
  title?: string;
  description?: string;
  snippet?: string;
}

interface DiscoveryCandidate {
  url: string;
  title: string;
  description: string;
  signature: string;
  ipId: string;
  ipName: string;
}

interface DiscoveryRun {
  at: string;
  results: number;
  candidates: number;
  processed: number;
  imported: number;
  errors: number;
  searchCredits: number;
  scrapeCredits: number;
}

interface DiscoveryState {
  source: "web-discovery";
  lastSearchedAt: string | null;
  seen: Record<string, { signature: string; status: "imported" | "ignored"; processedAt: string }>;
  pending: DiscoveryCandidate[];
  history: DiscoveryRun[];
  totalEstimatedCredits: number;
}

const emptyState = (): DiscoveryState => ({ source: "web-discovery", lastSearchedAt: null, seen: {}, pending: [], history: [], totalEstimatedCredits: 0 });

async function loadState(): Promise<DiscoveryState> {
  try {
    return { ...emptyState(), ...JSON.parse(await readFile(/* turbopackIgnore: true */ stateFile, "utf8")) as DiscoveryState };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyState();
    throw error;
  }
}

async function saveState(state: DiscoveryState) {
  await mkdir(/* turbopackIgnore: true */ path.dirname(stateFile), { recursive: true });
  const temporary = `${stateFile}.tmp`;
  await writeFile(/* turbopackIgnore: true */ temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(/* turbopackIgnore: true */ temporary, stateFile);
}

export function normalizeDiscoveryUrl(input: string) {
  const url = new URL(input);
  url.hostname = url.hostname.toLowerCase();
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|spm$|from$|share|from_source)/i.test(key)) url.searchParams.delete(key);
  }
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.toString();
}

const normalizeText = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[\s\-_：:·×'’]/g, "");

export function resolveDiscoveryIp(value: string) {
  const text = normalizeText(value);
  return ips.flatMap((ip) => {
    const canonical = [ip.name, ip.nativeName, ip.englishName];
    const aliases = ip.aliases.filter((alias) => normalizeText(alias).length >= 3);
    return [...new Set([...canonical, ...aliases])]
      .filter((alias) => alias && text.includes(normalizeText(alias)))
      .map((alias) => ({ id: ip.id, name: ip.name, length: normalizeText(alias).length }));
  }).sort((a, b) => b.length - a.length)[0] ?? null;
}

function signature(item: SearchItem) {
  return createHash("sha1").update(`${item.title ?? ""}\n${item.description ?? item.snippet ?? ""}`).digest("hex");
}

export async function syncWebDiscovery(options: { force?: boolean; now?: Date } = {}) {
  const now = options.now ?? new Date();
  const state = await loadState();
  const baseReport = {
    source: "web-discovery" as const,
    lastSearchedAt: state.lastSearchedAt,
    queries: 0,
    results: 0,
    newCandidates: 0,
    processed: 0,
    imported: [] as Array<{ url: string; id: string; title: string }>,
    skipped: [] as Array<{ url: string; title: string; reason: string }>,
    errors: [] as Array<{ query?: string; url?: string; title?: string; error: string }>,
    pendingCount: state.pending.length,
    estimatedCredits: { search: 0, scrape: 0, total: 0 },
    totalEstimatedCredits: state.totalEstimatedCredits,
  };
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return { ...baseReport, status: "disabled" as const };
  if (!options.force && state.lastSearchedAt && now.getTime() - Date.parse(state.lastSearchedAt) < SEARCH_INTERVAL_MS) {
    return { ...baseReport, status: "not-due" as const };
  }

  const searchedAt = now.toISOString();
  state.lastSearchedAt = searchedAt;
  const candidates = new Map(state.pending.map((item) => [item.url, item]));
  let results = 0;
  let searchCredits = 0;
  let scrapeCredits = 0;

  for (const definition of discoveryQueries) {
    baseReport.queries += 1;
    searchCredits += 2;
    try {
      const response = await fetchPublic(SEARCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ ...definition, sources: ["web"], limit: 10, tbs: "sbd:1,qdr:w", safe: true }),
      }, 60_000);
      if (!response.ok) throw new Error(`Firecrawl Search 返回 ${response.status}`);
      const payload = await response.json() as { success?: boolean; data?: { web?: SearchItem[] } | SearchItem[] };
      if (payload.success === false) throw new Error("Firecrawl Search 未返回成功状态");
      const items = Array.isArray(payload.data) ? payload.data : payload.data?.web ?? [];
      results += items.length;
      for (const item of items) {
        try {
          const url = normalizeDiscoveryUrl(item.url);
          const title = item.title?.trim() || new URL(url).hostname;
          const description = item.description ?? item.snippet ?? "";
          const itemSignature = signature(item);
          if (state.seen[url]?.signature === itemSignature) continue;
          const ip = resolveDiscoveryIp(`${title}\n${description}`);
          if (!ip || !collabPattern.test(`${title}\n${description}`) || !foodPattern.test(`${title}\n${description}`)) continue;
          candidates.set(url, { url, title, description, signature: itemSignature, ipId: ip.id, ipName: ip.name });
        } catch {
          // 忽略单个无效搜索结果，不影响其他查询。
        }
      }
    } catch (error) {
      baseReport.errors.push({ query: definition.query, error: error instanceof Error ? error.message : "未知搜索错误" });
    }
  }

  baseReport.results = results;
  baseReport.newCandidates = candidates.size;
  for (const candidate of candidates.values()) {
    if (baseReport.processed >= MAX_DAILY_SCRAPES) break;
    baseReport.processed += 1;
    if (!getOfficialSourceByHostname(new URL(candidate.url).hostname)) scrapeCredits += 1;
    try {
      const raw = await fetchAnnouncement(candidate.url);
      if (!raw.publishedAt) {
        state.seen[candidate.url] = { signature: candidate.signature, status: "ignored", processedAt: searchedAt };
        baseReport.skipped.push({ url: candidate.url, title: candidate.title, reason: "公告发布日期缺失" });
        candidates.delete(candidate.url);
        continue;
      }
      if (!isWithinSyncWindow(raw.publishedAt, now)) {
        state.seen[candidate.url] = { signature: candidate.signature, status: "ignored", processedAt: searchedAt };
        baseReport.skipped.push({ url: candidate.url, title: candidate.title, reason: "公告超过最近一年" });
        candidates.delete(candidate.url);
        continue;
      }
      const images = raw.images.length ? await prepareModelImages(raw.images) : { content: [], tileCount: 0, totalBytes: 0, warnings: [] };
      const draft = await extractCollab(raw, images.content);
      draft.ipId = candidate.ipId;
      draft.ipName = candidate.ipName;
      draft.announcedAt = raw.publishedAt;
      const rejectionReason = !draft.isCollab ? "非餐饮联动"
        : !isWithinSyncWindow(draft.startDate, now) ? "活动开始时间超过最近一年"
          : draft.startDate && draft.endDate && draft.endDate < draft.startDate ? "活动日期范围无效" : "";
      if (rejectionReason) {
        state.seen[candidate.url] = { signature: candidate.signature, status: "ignored", processedAt: searchedAt };
        baseReport.skipped.push({ url: candidate.url, title: candidate.title, reason: rejectionReason });
        candidates.delete(candidate.url);
        continue;
      }
      const saved = await saveImportedCollaboration(raw, draft, { latestForIp: candidate.ipId, updateExisting: true });
      state.seen[candidate.url] = { signature: candidate.signature, status: saved.skipped ? "ignored" : "imported", processedAt: searchedAt };
      if (saved.skipped) baseReport.skipped.push({ url: candidate.url, title: candidate.title, reason: "不晚于该 IP 当前最新记录" });
      else baseReport.imported.push({ url: candidate.url, id: saved.collaboration.id, title: saved.collaboration.title });
      candidates.delete(candidate.url);
    } catch (error) {
      baseReport.errors.push({ url: candidate.url, title: candidate.title, error: error instanceof Error ? error.message : "未知解析错误" });
    }
  }

  state.pending = [...candidates.values()];
  state.totalEstimatedCredits += searchCredits + scrapeCredits;
  state.history = [...state.history, {
    at: searchedAt,
    results,
    candidates: baseReport.newCandidates,
    processed: baseReport.processed,
    imported: baseReport.imported.length,
    errors: baseReport.errors.length,
    searchCredits,
    scrapeCredits,
  }].slice(-30);
  await saveState(state);

  return {
    ...baseReport,
    status: baseReport.errors.length ? "partial" as const : "completed" as const,
    lastSearchedAt: searchedAt,
    pendingCount: state.pending.length,
    estimatedCredits: { search: searchCredits, scrape: scrapeCredits, total: searchCredits + scrapeCredits },
    totalEstimatedCredits: state.totalEstimatedCredits,
  };
}

export type WebDiscoveryReport = Awaited<ReturnType<typeof syncWebDiscovery>>;
