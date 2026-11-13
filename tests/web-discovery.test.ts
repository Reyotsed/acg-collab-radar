import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CollabDraft } from "@/lib/ingest/types";
import { normalizeDiscoveryUrl, syncWebDiscovery } from "@/lib/sources/web-discovery";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  fetchDetail: vi.fn(),
  prepareImages: vi.fn(),
  extract: vi.fn(),
  saveImported: vi.fn(),
  state: { value: null as string | null },
}));

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockImplementation(async () => {
    if (mocks.state.value === null) {
      const error = new Error("ENOENT") as NodeJS.ErrnoException;
      error.code = "ENOENT";
      throw error;
    }
    return mocks.state.value;
  }),
  writeFile: vi.fn().mockImplementation(async (_file, content) => { mocks.state.value = String(content); }),
  rename: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/ingest/http", () => ({ fetchPublic: mocks.fetch }));
vi.mock("@/lib/ingest/fetch", () => ({ fetchAnnouncement: mocks.fetchDetail }));
vi.mock("@/lib/ingest/images", () => ({ prepareModelImages: mocks.prepareImages }));
vi.mock("@/lib/ingest/extract", () => ({ extractCollab: mocks.extract }));
vi.mock("@/lib/imported-store", () => ({ saveImportedCollaboration: mocks.saveImported }));

const now = new Date("2026-11-13T12:00:00+08:00");

function searchResponse(web: Array<{ url: string; title: string; description: string }>) {
  return new Response(JSON.stringify({ success: true, data: { web } }), { status: 200, headers: { "Content-Type": "application/json" } });
}

function result(index: number) {
  return {
    url: `https://example.com/collab/${index}?utm_source=test`,
    title: `原神 × 喜茶 联名饮品 ${index}`,
    description: "餐饮套餐、主题杯和周边活动",
  };
}

function draft(): CollabDraft {
  return {
    isCollab: true,
    ipId: "genshin",
    ipName: "原神",
    title: "原神 × 喜茶",
    brand: "喜茶",
    category: "tea",
    region: "中国大陆",
    location: "全国门店",
    startDate: "2026-11-12",
    endDate: null,
    endRule: null,
    announcedAt: "2026-11-13",
    summary: "联名饮品和周边",
    tags: ["茶饮"],
    confidence: 0.9,
    evidenceQuotes: [],
    warnings: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("FIRECRAWL_API_KEY", "test-key");
  mocks.state.value = null;
  mocks.prepareImages.mockResolvedValue({ content: [], tileCount: 0, totalBytes: 0, warnings: [] });
  mocks.fetchDetail.mockImplementation(async (url: string) => ({
    url,
    title: "原神 × 喜茶 联名饮品",
    publishedAt: "2026-11-13",
    sourceName: "example.com",
    sourceTier: "media",
    fetcher: "firecrawl",
    firecrawlAttempted: true,
    text: "联名饮品、套餐、周边和活动时间",
    images: [],
  }));
  mocks.extract.mockResolvedValue(draft());
  mocks.saveImported.mockImplementation(async (raw) => ({
    collaboration: { id: `imported-${mocks.saveImported.mock.calls.length}`, title: raw.title, startDate: "2026-11-12", endDate: null },
    duplicate: false,
  }));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Firecrawl web discovery", () => {
  it("normalizes tracking parameters in result URLs", () => {
    expect(normalizeDiscoveryUrl("https://EXAMPLE.com/news/1/?utm_source=x&spm=abc&id=2#top"))
      .toBe("https://example.com/news/1?id=2");
  });

  it("is disabled without an API key", async () => {
    vi.stubEnv("FIRECRAWL_API_KEY", "");
    const report = await syncWebDiscovery({ now });
    expect(report.status).toBe("disabled");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("runs three queries, scrapes at most five pages and records estimated credits", async () => {
    mocks.fetch
      .mockResolvedValueOnce(searchResponse(Array.from({ length: 6 }, (_, index) => result(index))))
      .mockResolvedValueOnce(searchResponse([]))
      .mockResolvedValueOnce(searchResponse([]));

    const report = await syncWebDiscovery({ now });
    const state = JSON.parse(mocks.state.value!);

    expect(report).toMatchObject({
      status: "completed",
      queries: 3,
      results: 6,
      processed: 5,
      pendingCount: 1,
      estimatedCredits: { search: 6, scrape: 5, total: 11 },
      totalEstimatedCredits: 11,
    });
    expect(report.imported).toHaveLength(5);
    expect(Object.keys(state.seen)).toHaveLength(5);
    expect(state.pending).toHaveLength(1);
    expect(state.history).toHaveLength(1);
  });

  it("skips the search when the daily interval has not elapsed", async () => {
    mocks.state.value = JSON.stringify({
      source: "web-discovery",
      lastSearchedAt: now.toISOString(),
      seen: {},
      pending: [],
      history: [],
      totalEstimatedCredits: 42,
    });

    const report = await syncWebDiscovery({ now: new Date(now.getTime() + 60 * 60 * 1000) });

    expect(report).toMatchObject({ status: "not-due", queries: 0, totalEstimatedCredits: 42 });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("does not scrape an unchanged URL again", async () => {
    mocks.fetch.mockResolvedValue(searchResponse([result(1)]));
    await syncWebDiscovery({ now });
    mocks.fetch.mockResolvedValue(searchResponse([result(1)]));

    const report = await syncWebDiscovery({ force: true, now: new Date(now.getTime() + 86_400_000) });

    expect(report.processed).toBe(0);
    expect(mocks.fetchDetail).toHaveBeenCalledTimes(1);
    expect(report.totalEstimatedCredits).toBe(13);
  });

  it("records query failures and keeps the daily frequency boundary", async () => {
    mocks.fetch.mockRejectedValue(new Error("Firecrawl Search 返回 429"));

    const report = await syncWebDiscovery({ now });
    const state = JSON.parse(mocks.state.value!);

    expect(report.status).toBe("partial");
    expect(report.errors).toHaveLength(3);
    expect(report.estimatedCredits.total).toBe(6);
    expect(state.lastSearchedAt).toBe(now.toISOString());
    expect(mocks.fetchDetail).not.toHaveBeenCalled();
  });
});
