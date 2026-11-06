import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CollabDraft, RawAnnouncement } from "@/lib/ingest/types";
import { officialSources } from "@/lib/sources/registry";
import { syncOfficialSource } from "@/lib/sources/sync";
import type { OfficialSourceDefinition, SourceNewsItem } from "@/lib/sources/types";

const mocks = vi.hoisted(() => ({
  extract: vi.fn(),
  fetch: vi.fn(),
  prepareImages: vi.fn(),
  saveImported: vi.fn(),
  loadState: vi.fn(),
  saveState: vi.fn(),
}));

vi.mock("@/lib/ingest/extract", () => ({ extractCollab: mocks.extract }));
vi.mock("@/lib/ingest/fetch", () => ({ fetchAnnouncement: mocks.fetch }));
vi.mock("@/lib/ingest/images", () => ({ prepareModelImages: mocks.prepareImages }));
vi.mock("@/lib/imported-store", () => ({ saveImportedCollaboration: mocks.saveImported }));
vi.mock("@/lib/sources/state", () => ({ loadSourceState: mocks.loadState, saveSourceState: mocks.saveState }));

const now = new Date("2026-11-06T12:00:00+08:00");

function news(id: string, title: string, publishedAt: string): SourceNewsItem {
  return { id, title, publishedAt, signature: `${title}\n${publishedAt}` };
}

function hash(item: SourceNewsItem) {
  return createHash("sha1").update(item.signature).digest("hex");
}

function draft(startDate: string | null = "2026-11-01"): CollabDraft {
  return {
    isCollab: true,
    ipId: "genshin",
    ipName: "原神",
    title: "最新餐饮联动",
    brand: "肯德基",
    category: "fastfood",
    region: "中国大陆",
    location: "全国门店",
    startDate,
    endDate: "2026-11-30",
    endRule: null,
    announcedAt: "2026-11-01",
    summary: "最新联动",
    tags: ["联动"],
    confidence: 0.99,
    evidenceQuotes: [],
    warnings: [],
  };
}

function raw(item: SourceNewsItem): RawAnnouncement {
  return {
    url: `https://ys.mihoyo.com/main/news/detail/${item.id}`,
    title: item.title,
    publishedAt: item.publishedAt,
    sourceName: "原神官网",
    sourceTier: "official",
    fetcher: "mihoyo-content-v2",
    text: "联动正文",
    images: [],
  };
}

function sourceWith(items: SourceNewsItem[]): OfficialSourceDefinition {
  return {
    ...officialSources[0],
    list: vi.fn().mockResolvedValueOnce(items).mockResolvedValue([]),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.loadState.mockResolvedValue({ source: "genshin", processed: {} });
  mocks.saveState.mockResolvedValue(undefined);
  mocks.prepareImages.mockResolvedValue({ content: [], tileCount: 0, totalBytes: 0, warnings: [] });
  mocks.fetch.mockImplementation(async (url: string) => raw(news(url.split("/").at(-1)!, "最新餐饮联动", "2026-11-01")));
  mocks.extract.mockResolvedValue(draft());
  mocks.saveImported.mockResolvedValue({
    collaboration: { id: "imported-latest", title: "最新餐饮联动", startDate: "2026-11-01", endDate: "2026-11-30" },
    duplicate: false,
  });
});

describe("latest-only official source synchronization", () => {
  it("stops at the already synchronized latest collaboration instead of backfilling older records", async () => {
    const latest = news("latest", "最新肯德基联动", "2026-11-01");
    const older = news("older", "更早瑞幸联动", "2026-10-01");
    mocks.loadState.mockResolvedValue({
      source: "genshin",
      processed: {
        latest: { status: "done", contentHash: hash(latest), collaborationId: "imported-latest", processedAt: "2026-11-01" },
      },
    });

    const report = await syncOfficialSource(sourceWith([latest, older]), now);

    expect(report.stopReason).toBe("latest-already-synced");
    expect(report.stoppedAt?.id).toBe("latest");
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.saveImported).not.toHaveBeenCalled();
  });

  it("stops before announcements older than one year", async () => {
    const recent = news("recent", "版本更新公告", "2026-11-01");
    const ancient = news("ancient", "2019 肯德基联动", "2019-10-27");
    const source = sourceWith([recent, ancient]);

    const report = await syncOfficialSource(source, now);

    expect(report.stopReason).toBe("lookback-limit");
    expect(report.stoppedAt?.id).toBe("ancient");
    expect(source.list).toHaveBeenCalledTimes(1);
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.saveImported).not.toHaveBeenCalled();
  });

  it("saves only the first valid collaboration and prunes older records for that IP", async () => {
    const latest = news("latest", "最新肯德基联动", "2026-11-01");
    const older = news("older", "更早瑞幸联动", "2026-10-01");
    mocks.fetch.mockResolvedValue(raw(latest));
    const source = sourceWith([latest, older]);

    const report = await syncOfficialSource(source, now);

    expect(report.stopReason).toBe("latest-collab-saved");
    expect(report.result?.id).toBe("imported-latest");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.saveImported).toHaveBeenCalledWith(raw(latest), expect.any(Object), { latestForIp: "genshin" });
    expect(source.list).toHaveBeenCalledTimes(1);
  });

  it("rejects an old campaign even when its announcement was published recently", async () => {
    const item = news("retrospective", "旧联动回顾", "2026-11-01");
    mocks.fetch.mockResolvedValue(raw(item));
    mocks.extract.mockResolvedValue(draft("2024-01-01"));

    const report = await syncOfficialSource(sourceWith([item]), now);

    expect(report.candidates[0]).toMatchObject({ status: "rejected", reason: "超出最近一年范围" });
    expect(mocks.saveImported).not.toHaveBeenCalled();
  });
});
