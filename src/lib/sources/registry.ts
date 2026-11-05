import { arknightsSource } from "./arknights";
import { createMihoyoSource } from "./mihoyo";
import type { SourceId } from "./types";

export const officialSources = [
  createMihoyoSource({
    id: "genshin",
    ipId: "genshin",
    ipName: "原神",
    sourceName: "原神官网",
    matches: (hostname) => hostname === "ys.mihoyo.com",
    detailUrl: (id) => `https://ys.mihoyo.com/main/news/detail/${id}`,
    mihoyo: {
      apiBase: "https://act-api-takumi-static.mihoyo.com/content_v2_user/app/16471662a82d418a",
      channelId: 719,
      iAppId: "43",
    },
  }),
  createMihoyoSource({
    id: "hsr",
    ipId: "hsr",
    ipName: "崩坏：星穹铁道",
    sourceName: "崩坏：星穹铁道官网",
    matches: (hostname) => hostname === "sr.mihoyo.com",
    detailUrl: (id) => `https://sr.mihoyo.com/news/${id}`,
    mihoyo: {
      apiBase: "https://act-api-takumi-static.mihoyo.com/content_v2_user/app/1963de8dc19e461c",
      channelId: 255,
    },
  }),
  createMihoyoSource({
    id: "bh3",
    ipId: "bh3",
    ipName: "崩坏3",
    sourceName: "崩坏3官网",
    matches: (hostname) => hostname === "bh3.mihoyo.com",
    detailUrl: (id) => `https://bh3.mihoyo.com/news/693/${id}`,
    mihoyo: {
      apiBase: "https://act-api-takumi-static.mihoyo.com/content_v2_user/app/b9d5f96cd69047eb",
      channelId: 693,
    },
  }),
  createMihoyoSource({
    id: "zzz",
    ipId: "zzz",
    ipName: "绝区零",
    sourceName: "绝区零官网",
    matches: (hostname) => hostname === "zzz.mihoyo.com",
    detailUrl: (id) => `https://zzz.mihoyo.com/news/${id}`,
    mihoyo: {
      apiBase: "https://api-takumi-static.mihoyo.com/content_v2_user/app/706fd13a87294881",
      channelId: 273,
    },
  }),
  arknightsSource,
];

export function getOfficialSource(id: SourceId) {
  const source = officialSources.find((item) => item.id === id);
  if (!source) throw new Error(`未知官方来源：${id}`);
  return source;
}

export function getOfficialSourceByHostname(hostname: string) {
  return officialSources.find((source) => source.matches(hostname));
}
