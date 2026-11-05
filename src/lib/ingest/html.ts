import { load } from "cheerio";

export function parseAnnouncementHtml(html: string, sourceUrl: string) {
  const $ = load(html);
  $("script, style, noscript, svg, nav, footer").remove();
  const title = $("meta[property='og:title']").attr("content") || $("h1").first().text().trim() || $("title").text().trim();
  const publishedAt = $("meta[property='article:published_time']").attr("content")?.slice(0, 10) || "";
  const imageUrls = [
    ...$("img").map((_, element) => $(element).attr("src")).get(),
    ...$("video[poster]").map((_, element) => $(element).attr("poster")).get(),
  ];
  const images = [...new Set(imageUrls.filter(Boolean).map((src) => new URL(src, sourceUrl).toString()))];
  const root = $("article").length ? $("article") : $("main").length ? $("main") : $("body");
  const text = root.text().replace(/\s+/g, " ").trim();
  return { title, publishedAt, images, text };
}
