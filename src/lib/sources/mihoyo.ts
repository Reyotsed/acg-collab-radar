import { parseAnnouncementHtml } from "@/lib/ingest/html";
import { fetchPublic } from "@/lib/ingest/http";
import type { RawAnnouncement } from "@/lib/ingest/types";
import type { OfficialSourceDefinition } from "./types";

interface MihoyoNewsItem {
  iInfoId: number;
  sTitle: string;
  sContent?: string;
  sIntro?: string;
  dtStartTime?: string;
}

type MihoyoSourceOptions = Omit<OfficialSourceDefinition, "kind" | "list" | "mihoyo"> & {
  mihoyo: NonNullable<OfficialSourceDefinition["mihoyo"]>;
};

export function createMihoyoSource(options: MihoyoSourceOptions): OfficialSourceDefinition {
  return {
    ...options,
    kind: "mihoyo",
    async list(page) {
      const { apiBase, channelId, iAppId } = options.mihoyo;
      const query = new URLSearchParams({
        iChanId: String(channelId),
        iPageSize: "20",
        iPage: String(page),
        sLangKey: "zh-cn",
        isPreview: "0",
      });
      if (iAppId) query.set("iAppId", iAppId);
      const response = await fetchPublic(`${apiBase}/getContentList?${query}`);
      if (!response.ok) throw new Error(`${options.sourceName}列表第 ${page} 页返回 ${response.status}`);
      const payload = await response.json() as { retcode: number; data?: { list?: MihoyoNewsItem[] } };
      if (payload.retcode !== 0) throw new Error(`${options.sourceName}列表第 ${page} 页读取失败`);
      return (payload.data?.list ?? []).map((item) => ({
        id: String(item.iInfoId),
        title: item.sTitle,
        signature: `${item.sTitle}\n${item.sContent ?? item.sIntro ?? ""}`,
        publishedAt: item.dtStartTime?.slice(0, 10) ?? "",
      }));
    },
  };
}

export async function fetchMihoyoAnnouncement(source: OfficialSourceDefinition, url: string, infoId: string): Promise<RawAnnouncement> {
  if (!source.mihoyo) throw new Error(`${source.sourceName}缺少米哈游接口配置`);
  const { apiBase, iAppId } = source.mihoyo;
  const query = new URLSearchParams({ iInfoId: infoId, sLangKey: "zh-cn", iAround: "0", isPreview: "0" });
  if (iAppId) query.set("iAppId", iAppId);
  const response = await fetchPublic(`${apiBase}/getContent?${query}`);
  if (!response.ok) throw new Error(`${source.sourceName}详情接口返回 ${response.status}`);
  const payload = await response.json() as {
    retcode: number;
    data?: { sTitle?: string; sContent?: string; dtStartTime?: string; dtCreateTime?: string };
  };
  if (payload.retcode !== 0 || !payload.data) throw new Error(`${source.sourceName}详情接口未返回有效内容`);
  const parsed = parseAnnouncementHtml(payload.data.sContent ?? "", url);
  const text = source.id === "genshin" ? parsed.text.split("关于《原神》")[0].trim() : parsed.text;
  return {
    url,
    title: payload.data.sTitle || parsed.title,
    publishedAt: payload.data.dtStartTime?.slice(0, 10) || payload.data.dtCreateTime?.slice(0, 10) || "",
    sourceName: source.sourceName,
    sourceTier: "official",
    fetcher: "mihoyo-content-v2",
    text,
    images: parsed.images,
  };
}
