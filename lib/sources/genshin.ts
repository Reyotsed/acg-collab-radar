import { createHash } from "node:crypto";
import { extractCollab } from "@/lib/ingest/extract";
import { fetchAnnouncement } from "@/lib/ingest/fetch";
import { fetchPublic } from "@/lib/ingest/http";
import { prepareModelImages } from "@/lib/ingest/images";
import { saveImportedCollaboration } from "@/lib/imported-store";
import { loadGenshinState, saveGenshinState } from "./genshin-state";

const PAGE_SIZE = 20;
const MAX_PAGES = 20;
const LIST_API = "https://act-api-takumi-static.mihoyo.com/content_v2_user/app/16471662a82d418a/getContentList";

interface NewsItem {
  iInfoId: number;
  sTitle: string;
  sContent: string;
  dtStartTime?: string;
}

export function isGenshinCollabCandidate(title: string) {
  return /联动|联名|合作/.test(title);
}

async function fetchNewsPage(page: number): Promise<NewsItem[]> {
  const query = new URLSearchParams({
    iAppId: "43",
    iChanId: "719",
    iPageSize: String(PAGE_SIZE),
    iPage: String(page),
    sLangKey: "zh-cn",
  });
  const response = await fetchPublic(`${LIST_API}?${query}`);
  if (!response.ok) throw new Error(`原神新闻列表第 ${page} 页返回 ${response.status}`);
  const payload = await response.json() as { retcode: number; data?: { list?: NewsItem[] } };
  if (payload.retcode !== 0) throw new Error(`原神新闻列表第 ${page} 页读取失败`);
  return payload.data?.list ?? [];
}

export async function syncLatestGenshinCollab() {
  const state = await loadGenshinState();
  const report = {
    pagesScanned: 0,
    itemsScanned: 0,
    newIdCount: 0,
    ignoredCount: 0,
    candidates: [] as Array<{ id: string; title: string; page: number; status: "imported" | "rejected" }>,
    result: null as null | { id: string; title: string; duplicate: boolean; startDate: string | null; endDate: string | null },
    stoppedAt: null as null | { page: number; id: string; title: string },
  };

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const list = await fetchNewsPage(page);
    report.pagesScanned = page;
    if (!list.length) break;
    let unchangedCount = 0;

    for (const item of list) {
      const id = String(item.iInfoId);
      const contentHash = createHash("sha1").update(`${item.sTitle}\n${item.sContent}`).digest("hex");
      const previous = state.processed[id];
      if (previous && (previous.contentHash === contentHash || previous.contentHash === "previously-imported")) {
        unchangedCount += 1;
        continue;
      }

      report.itemsScanned += 1;
      report.newIdCount += 1;
      if (!isGenshinCollabCandidate(item.sTitle)) {
        state.processed[id] = { status: "ignored", contentHash, processedAt: new Date().toISOString() };
        report.ignoredCount += 1;
        await saveGenshinState(state);
        continue;
      }

      const raw = await fetchAnnouncement(`https://ys.mihoyo.com/main/news/detail/${id}`);
      const images = raw.images.length ? await prepareModelImages(raw.images) : { content: [], tileCount: 0, totalBytes: 0, warnings: [] };
      const draft = await extractCollab(raw, images.content);
      draft.ipId = "genshin";
      draft.ipName = "原神";
      draft.announcedAt = raw.publishedAt;

      if (!draft.isCollab) {
        state.processed[id] = { status: "ignored", contentHash, processedAt: new Date().toISOString() };
        report.candidates.push({ id, title: item.sTitle, page, status: "rejected" });
        report.ignoredCount += 1;
        await saveGenshinState(state);
        continue;
      }

      const saved = await saveImportedCollaboration(raw, draft);
      state.processed[id] = {
        status: "done",
        contentHash,
        collaborationId: saved.collaboration.id,
        processedAt: new Date().toISOString(),
      };
      await saveGenshinState(state);
      report.candidates.push({ id, title: item.sTitle, page, status: "imported" });
      report.result = {
        id: saved.collaboration.id,
        title: saved.collaboration.title,
        duplicate: saved.duplicate,
        startDate: saved.collaboration.startDate,
        endDate: saved.collaboration.endDate,
      };
      report.stoppedAt = { page, id, title: item.sTitle };
      return report;
    }

    if (unchangedCount === list.length) break;
  }

  return report;
}
