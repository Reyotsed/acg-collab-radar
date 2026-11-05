import { createHash } from "node:crypto";
import { extractCollab } from "@/lib/ingest/extract";
import { fetchAnnouncement } from "@/lib/ingest/fetch";
import { prepareModelImages } from "@/lib/ingest/images";
import { saveImportedCollaboration } from "@/lib/imported-store";
import { officialSources } from "./registry";
import { loadSourceState, saveSourceState } from "./state";
import type { OfficialSourceDefinition, SourceId, SourceSyncReport } from "./types";

const MAX_PAGES = 20;
const candidatePattern = /联动|联名|合作|KFC|肯德基|麦当劳|瑞幸|喜茶|奈雪|茶百道|古茗|蜜雪|星巴克|必胜客|汉堡王|德克士|美团|大众点评|乐乐茶|霸王茶姬/i;

export function isCollabCandidate(title: string) {
  return candidatePattern.test(title);
}

export async function syncOfficialSource(source: OfficialSourceDefinition): Promise<SourceSyncReport> {
  const report: SourceSyncReport = {
    source: source.id,
    ipName: source.ipName,
    pagesScanned: 0,
    itemsScanned: 0,
    newIdCount: 0,
    ignoredCount: 0,
    candidates: [],
    result: null,
    stoppedAt: null,
  };

  try {
    const state = await loadSourceState(source.id);
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const list = await source.list(page);
      console.info(`[${source.id}] 第 ${page} 页：${list.length} 条公告`);
      report.pagesScanned = page;
      if (!list.length) break;

      for (const item of list) {
        const contentHash = createHash("sha1").update(item.signature).digest("hex");
        const previous = state.processed[item.id];
        const retryUndatedAnnouncement = previous?.reason === "缺少活动开始日期";
        if (previous && !retryUndatedAnnouncement && (previous.contentHash === contentHash || previous.contentHash === "previously-imported")) {
          continue;
        }

        report.itemsScanned += 1;
        report.newIdCount += 1;
        if (!isCollabCandidate(item.title)) {
          state.processed[item.id] = { status: "ignored", contentHash, processedAt: new Date().toISOString(), reason: "标题未命中候选词" };
          report.ignoredCount += 1;
          await saveSourceState(state);
          continue;
        }

        console.info(`[${source.id}] 解析候选 ${item.id}：${item.title}`);
        const raw = await fetchAnnouncement(source.detailUrl(item.id));
        if (!raw.publishedAt && item.publishedAt) raw.publishedAt = item.publishedAt;
        const images = raw.images.length ? await prepareModelImages(raw.images) : { content: [], tileCount: 0, totalBytes: 0, warnings: [] };
        const draft = await extractCollab(raw, images.content);
        draft.ipId = source.ipId;
        draft.ipName = source.ipName;
        if (raw.publishedAt) draft.announcedAt = raw.publishedAt;

        const rejectionReason = !draft.isCollab
          ? "非餐饮联动"
          : draft.startDate && draft.endDate && draft.endDate < draft.startDate
            ? "活动日期范围无效"
            : "";
        if (rejectionReason) {
          state.processed[item.id] = { status: "ignored", contentHash, processedAt: new Date().toISOString(), reason: rejectionReason };
          report.candidates.push({ id: item.id, title: item.title, page, status: "rejected", reason: rejectionReason });
          report.ignoredCount += 1;
          await saveSourceState(state);
          continue;
        }

        const saved = await saveImportedCollaboration(raw, draft);
        state.processed[item.id] = {
          status: "done",
          contentHash,
          collaborationId: saved.collaboration.id,
          processedAt: new Date().toISOString(),
        };
        await saveSourceState(state);
        report.candidates.push({ id: item.id, title: item.title, page, status: "imported" });
        report.result = {
          id: saved.collaboration.id,
          title: saved.collaboration.title,
          duplicate: saved.duplicate,
          startDate: saved.collaboration.startDate,
          endDate: saved.collaboration.endDate,
        };
        report.stoppedAt = { page, id: item.id, title: item.title };
        return report;
      }
    }
  } catch (error) {
    report.error = error instanceof Error ? error.message : "未知同步错误";
  }

  return report;
}

export async function syncOfficialSources(sourceIds?: SourceId[]) {
  const sources = sourceIds?.length ? officialSources.filter((source) => sourceIds.includes(source.id)) : officialSources;
  const reports: SourceSyncReport[] = [];
  for (const source of sources) reports.push(await syncOfficialSource(source));
  return reports;
}
