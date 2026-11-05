import { fetchPublic } from "@/lib/ingest/http";
import type { OfficialSourceDefinition, SourceNewsItem } from "./types";

const categories = ["ANNOUNCEMENT", "ACTIVITY", "NEWS"] as const;

interface ArknightsNewsItem {
  cid: string;
  title: string;
  brief?: string;
  displayTime: number;
}

function shanghaiDate(timestamp: number) {
  return new Date((timestamp + 8 * 60 * 60) * 1000).toISOString().slice(0, 10);
}

async function fetchCategory(category: string, page: number): Promise<ArknightsNewsItem[]> {
  const response = await fetchPublic(`https://ak.hypergryph.com/api/news?category=${category}&page=${page}`);
  if (!response.ok) throw new Error(`明日方舟官网 ${category} 第 ${page} 页返回 ${response.status}`);
  const payload = await response.json() as { code: number; msg?: string; data?: { list?: ArknightsNewsItem[] } };
  if (payload.code !== 0) throw new Error(`明日方舟官网 ${category} 读取失败：${payload.msg ?? "未知错误"}`);
  return payload.data?.list ?? [];
}

export const arknightsSource: OfficialSourceDefinition = {
  id: "arknights",
  kind: "arknights",
  ipId: "arknights",
  ipName: "明日方舟",
  sourceName: "明日方舟官网",
  matches: (hostname) => hostname === "ak.hypergryph.com",
  detailUrl: (id) => `https://ak.hypergryph.com/news/${id}`,
  async list(page) {
    const lists = await Promise.all(categories.map((category) => fetchCategory(category, page)));
    const items = new Map<string, SourceNewsItem>();
    for (const item of lists.flat()) {
      items.set(item.cid, {
        id: item.cid,
        title: item.title,
        signature: `${item.title}\n${item.brief ?? ""}\n${item.displayTime}`,
        publishedAt: shanghaiDate(item.displayTime),
      });
    }
    return [...items.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  },
};
