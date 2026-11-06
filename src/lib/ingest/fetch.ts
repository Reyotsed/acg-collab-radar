import { parseAnnouncementHtml } from "./html";
import { fetchPublic } from "./http";
import type { RawAnnouncement } from "./types";
import { getOfficialSourceByHostname } from "@/lib/sources/registry";
import { fetchMihoyoAnnouncement } from "@/lib/sources/mihoyo";

async function fetchFirecrawl(url: string, apiKey: string): Promise<RawAnnouncement> {
  const response = await fetchPublic("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ url, formats: ["markdown", "html"], onlyMainContent: true }),
  }, 60_000);
  if (!response.ok) throw new Error(`Firecrawl 返回 ${response.status}`);
  const payload = await response.json() as {
    success?: boolean;
    data?: { markdown?: string; html?: string; metadata?: { title?: string; publishedTime?: string } };
  };
  if (!payload.success || !payload.data) throw new Error("Firecrawl 未返回有效正文");
  const parsed = parseAnnouncementHtml(payload.data.html ?? "", url);
  return {
    url,
    title: payload.data.metadata?.title || parsed.title,
    publishedAt: payload.data.metadata?.publishedTime?.slice(0, 10) || parsed.publishedAt,
    sourceName: new URL(url).hostname,
    sourceTier: "media",
    fetcher: "firecrawl",
    text: payload.data.markdown || parsed.text,
    images: parsed.images,
  };
}

async function fetchDirect(url: string): Promise<RawAnnouncement> {
  const response = await fetchPublic(url);
  if (!response.ok) throw new Error(`公告页面返回 ${response.status}`);
  const html = await response.text();
  const parsed = parseAnnouncementHtml(html, url);
  return {
    url,
    title: parsed.title,
    publishedAt: parsed.publishedAt,
    sourceName: new URL(url).hostname,
    sourceTier: "media",
    fetcher: "direct-http",
    text: parsed.text,
    images: parsed.images,
  };
}

export async function fetchAnnouncement(input: string) {
  const url = new URL(input).toString();
  const source = getOfficialSourceByHostname(new URL(url).hostname);
  if (source) {
    if (source.kind === "mihoyo") {
      const infoId = new URL(url).pathname.match(/(\d+)\/?$/)?.[1];
      if (infoId) return fetchMihoyoAnnouncement(source, url, infoId);
    }
    const raw = await fetchDirect(url);
    return { ...raw, sourceName: source.sourceName, sourceTier: "official" as const, fetcher: "official-html" as const };
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (apiKey) {
    try {
      const raw = await fetchFirecrawl(url, apiKey);
      return { ...raw, firecrawlAttempted: true };
    } catch {
      const raw = await fetchDirect(url);
      return { ...raw, firecrawlAttempted: true };
    }
  }
  return fetchDirect(url);
}
