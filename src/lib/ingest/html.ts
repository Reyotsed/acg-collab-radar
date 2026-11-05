import { load } from "cheerio";

export function parseAnnouncementHtml(html: string, sourceUrl: string) {
  const $ = load(html);
  $("script, style, noscript, svg, nav, footer").remove();
  const title = $("meta[property='og:title']").attr("content") || $("h1").first().text().trim() || $("title").text().trim();
  const jsonLdPublishedAt = html.match(/"datePublished"\s*:\s*"(20\d{2}-\d{2}-\d{2})/)?.[1] || "";
  const metaPublishedAt = $("meta[property='article:published_time'], meta[name='publishtime'], meta[itemprop='datePublished']").first().attr("content")?.slice(0, 10) || jsonLdPublishedAt;
  const imageUrls = [
    ...$("img").map((_, element) => $(element).attr("src")).get(),
    ...$("video[poster]").map((_, element) => $(element).attr("poster")).get(),
  ];
  const images = [...new Set(imageUrls.filter(Boolean).map((src) => new URL(src, sourceUrl).toString()))];
  const root = $("article").length ? $("article") : $("main").length ? $("main") : $("body");
  const text = root.text().replace(/\s+/g, " ").trim();
  const visibleDate = text.match(/\b(20\d{2})\s*\/\/\s*(\d{2})\s*\/\s*(\d{2})\b/);
  const publishedAt = metaPublishedAt || (visibleDate ? `${visibleDate[1]}-${visibleDate[2]}-${visibleDate[3]}` : "");
  return { title, publishedAt, images, text };
}
