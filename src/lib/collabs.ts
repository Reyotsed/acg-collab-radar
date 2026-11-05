import { collaborations, getIp } from "./data";
import { ips } from "./data";
import type { CollabStatus, Collaboration, HeatBreakdown, RecentIpSummary, RecentQuery, Timeline } from "./types";

const DAY_MS = 86_400_000;
const REFERENCE_NOW = process.env.COLLAB_REFERENCE_NOW
  ? new Date(process.env.COLLAB_REFERENCE_NOW)
  : new Date();

const atDay = (date: string) => new Date(`${date}T00:00:00+08:00`);
const daysBetween = (from: Date, to: Date) => Math.floor((to.getTime() - from.getTime()) / DAY_MS);
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function getCollabStatus(collab: Collaboration, now = REFERENCE_NOW): CollabStatus {
  if (collab.statusOverride) return collab.statusOverride;
  const end = collab.endDate ? atDay(collab.endDate) : null;
  if (end && daysBetween(end, now) > 0) return "ended";
  if (!collab.startDate) return "announced";
  if (atDay(collab.startDate) > now) return "upcoming";
  return "ongoing";
}

function meaningfulDate(collab: Collaboration, now = REFERENCE_NOW) {
  const candidates = [collab.announcedAt, collab.updatedAt];
  if (collab.startDate && atDay(collab.startDate) <= now) candidates.push(collab.startDate);
  if (collab.endDate && atDay(collab.endDate) <= now) candidates.push(collab.endDate);
  return candidates.sort().at(-1) ?? collab.updatedAt;
}

function isRecent(collab: Collaboration, windowDays: number, now = REFERENCE_NOW) {
  const status = getCollabStatus(collab, now);
  if (status === "ongoing" || status === "upcoming") return true;
  const age = daysBetween(atDay(meaningfulDate(collab, now)), now);
  return age >= 0 && age <= windowDays;
}

function normalizeSearch(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[\s\-_：:·×'’]/g, "");
}

function calculateHeat(recent: Collaboration[], now = REFERENCE_NOW): { heat: number; breakdown: HeatBreakdown } {
  const latestAge = Math.max(0, daysBetween(atDay(meaningfulDate(recent[0], now)), now));
  const recency = Math.exp((-Math.LN2 * latestAge) / 21);
  const activity = Math.max(...recent.map((collab) => {
    const status = getCollabStatus(collab, now);
    if (status === "ongoing") return 1;
    if (status === "upcoming") return 0.8;
    return daysBetween(atDay(collab.endDate ?? meaningfulDate(collab, now)), now) <= 30 ? 0.3 : 0;
  }));
  const sourceCount = new Set(recent.flatMap((collab) => collab.sources.map((source) => source.source))).size;
  const sources = clamp01(Math.log1p(sourceCount) / Math.log1p(5));
  const campaigns = clamp01(Math.log1p(recent.length) / Math.log1p(5));
  const breakdown = { recency, activity, sources, campaigns };
  const heat = Math.round(100 * (0.45 * recency + 0.25 * activity + 0.2 * sources + 0.1 * campaigns));
  return { heat, breakdown };
}

export function getRecentIpSummaries(query: RecentQuery = {}, imported: Collaboration[] = []): RecentIpSummary[] {
  const now = REFERENCE_NOW;
  const windowDays = query.windowDays ?? 90;
  const normalizedQuery = normalizeSearch(query.q?.trim() ?? "");
  const allCollaborations = [...collaborations, ...imported];

  return ips.flatMap((ip) => {
    const matchesSearch = !normalizedQuery || [ip.name, ip.nativeName, ip.englishName, ...ip.aliases]
      .some((alias) => normalizeSearch(alias).includes(normalizedQuery));
    if (!matchesSearch) return [];

    const candidates = allCollaborations.filter((collab) => {
      if (!collab.ipIds.includes(ip.id)) return false;
      if (query.category && query.category !== "all" && collab.category !== query.category) return false;
      if (query.region && query.region !== "all" && collab.region !== query.region) return false;
      if (query.status && query.status !== "all" && getCollabStatus(collab, now) !== query.status) return false;
      return true;
    });
    const recent = candidates.filter((collab) => isRecent(collab, windowDays, now));
    if (!recent.length) return [];

    recent.sort((a, b) => meaningfulDate(b, now).localeCompare(meaningfulDate(a, now)));
    const { heat, breakdown } = calculateHeat(recent, now);
    const statuses = candidates.map((collab) => getCollabStatus(collab, now));
    const sourceCount = new Set(recent.flatMap((collab) => collab.sources.map((source) => source.source))).size;

    return [{
      ip,
      heat,
      heatBreakdown: breakdown,
      ongoingCount: statuses.filter((status) => status === "ongoing").length,
      upcomingCount: statuses.filter((status) => status === "upcoming").length,
      recentCount: recent.length,
      sourceCount,
      latestAt: meaningfulDate(recent[0], now),
      latestCollab: recent[0],
    }];
  }).sort((a, b) => b.heat - a.heat || b.latestAt.localeCompare(a.latestAt) || a.ip.name.localeCompare(b.ip.name, "zh-CN"));
}

export function getIpTimeline(ipId: string, timeline: Timeline = "all", imported: Collaboration[] = []) {
  const all = [...collaborations, ...imported].filter((collab) => collab.ipIds.includes(ipId));
  const filtered = all.filter((collab) => {
    const status = getCollabStatus(collab);
    if (timeline === "current") return status === "ongoing" || status === "upcoming" || status === "announced";
    if (timeline === "history") return status === "ended" || status === "cancelled";
    return true;
  });

  return filtered.sort((a, b) => {
    const statusA = getCollabStatus(a);
    const statusB = getCollabStatus(b);
    if (timeline === "current" && statusA !== statusB) {
      if (statusA === "ongoing") return -1;
      if (statusB === "ongoing") return 1;
    }
    if (statusA === "upcoming" && statusB === "upcoming") return (a.startDate ?? "").localeCompare(b.startDate ?? "");
    return (b.startDate ?? "").localeCompare(a.startDate ?? "") || b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function getIpDetail(ipId: string, imported: Collaboration[] = []) {
  const ip = getIp(ipId);
  if (!ip) return null;
  const current = getIpTimeline(ipId, "current", imported);
  const history = getIpTimeline(ipId, "history", imported);
  const all = getIpTimeline(ipId, "all", imported);
  const years = [...new Set(all.map((collab) => collab.startDate?.slice(0, 4)).filter((year): year is string => Boolean(year)))].sort((a, b) => b.localeCompare(a));
  const brands = [...new Set(all.map((collab) => collab.brand))];
  const sourceCount = new Set(all.flatMap((collab) => collab.sources.map((source) => source.source))).size;
  return { ip, current, history, all, years, brands, sourceCount };
}

export function getRadarStats(imported: Collaboration[] = []) {
  const allCollaborations = [...collaborations, ...imported];
  const activeIps = new Set(allCollaborations.filter((collab) => ["ongoing", "upcoming", "announced"].includes(getCollabStatus(collab))).flatMap((collab) => collab.ipIds));
  return {
    trackedIps: activeIps.size,
    ongoing: allCollaborations.filter((collab) => getCollabStatus(collab) === "ongoing").length,
    upcoming: allCollaborations.filter((collab) => getCollabStatus(collab) === "upcoming").length,
    sources: new Set(allCollaborations.flatMap((collab) => collab.sources.map((source) => source.source))).size,
  };
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Shanghai" })
    .format(atDay(date)).replaceAll("/", ".");
}

export function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", timeZone: "Asia/Shanghai" }).format(atDay(date));
}

export function formatDateRange(collab: Collaboration) {
  if (!collab.startDate) return collab.endDate ? `开始时间未官宣 — ${formatDate(collab.endDate)}` : "活动时间未官宣";
  return `${formatDate(collab.startDate)} — ${collab.endDate ? formatDate(collab.endDate) : "结束时间未官宣"}`;
}

export function getRelativeLabel(date: string) {
  const days = daysBetween(atDay(date), REFERENCE_NOW);
  if (days === 0) return "今天更新";
  if (days > 0) return `${days} 天前更新`;
  return `${Math.abs(days)} 天后`;
}

export { REFERENCE_NOW };
