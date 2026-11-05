import { load } from "cheerio";
import { fetchPublic } from "./http";
import type { RawAnnouncement } from "./types";

function parseHtml(html: string, sourceUrl: string) {
  const $ = load(html);
  $("script, style, noscript, svg, nav, footer").remove();
  const title = $("meta[property='og:title']").attr("content") || $("h1").first().text().trim() || $("title").text().trim();
  const publishedAt = $("meta[property='article:published_time']").attr("content")?.slice(0, 10) || "";
  const images = [...new Set($("img").map((_, element) => $(element).attr("src")).get().filter(Boolean)
    .map((src) => new URL(src, sourceUrl).toString()))];
  const root = $("article").length ? $("article") : $("main").length ? $("main") : $("body");
  const text = root.text().replace(/\s+/g, " ").trim();
  return { title, publishedAt, images, text };
}

async function fetchMihoyo(url: string, infoId: string): Promise<RawAnnouncement> {
  const api = `https://act-api-takumi-static.mihoyo.com/content_v2_user/app/16471662a82d418a/getContent?iAppId=43&iInfoId=${infoId}&sLangKey=zh-cn&iAround=0`;
  const response = await fetchPublic(api);
  if (!response.ok) throw new Error(`原神公告接口返回 ${response.status}`);
  const payload = await response.json() as {
    retcode: number;
    data?: { sTitle?: string; sContent?: string; dtStartTime?: string; dtCreateTime?: string };
  };
  if (payload.retcode !== 0 || !payload.data) throw new Error("原神公告接口未返回有效内容");
  const parsed = parseHtml(payload.data.sContent ?? "", url);
  return {
    url,
    title: payload.data.sTitle || parsed.title,
    publishedAt: payload.data.dtStartTime?.slice(0, 10) || payload.data.dtCreateTime?.slice(0, 10) || "",
    sourceName: "原神官网",
    sourceTier: "official",
    fetcher: "mihoyo-api",
    text: parsed.text.split("关于《原神》")[0].trim(),
    images: parsed.images,
  };
}

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
  const parsed = parseHtml(payload.data.html ?? "", url);
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
  const parsed = parseHtml(html, url);
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
  const mihoyoMatch = url.match(/^https:\/\/ys\.mihoyo\.com\/main\/news\/detail\/(\d+)/);
  if (mihoyoMatch) return fetchMihoyo(url, mihoyoMatch[1]);

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (apiKey) {
    try {
      return await fetchFirecrawl(url, apiKey);
    } catch {
      return fetchDirect(url);
    }
  }
  return fetchDirect(url);
}
