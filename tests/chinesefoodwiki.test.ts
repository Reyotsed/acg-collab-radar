import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CollabDraft } from "@/lib/ingest/types";
import { parseChineseFoodWikiRows, syncChineseFoodWiki } from "@/lib/sources/chinesefoodwiki";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  fetchDetail: vi.fn(),
  prepareImages: vi.fn(),
  extract: vi.fn(),
  getImported: vi.fn(),
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
vi.mock("@/lib/imported-store", () => ({
  getImportedCollaborations: mocks.getImported,
  saveImportedCollaboration: mocks.saveImported,
}));

function row(date: string, brand: string, ip: string, notes = "Nationwide drinks and cups.", source = "https://example.com/official") {
  return `| ${date}\n| ${brand}\n| ${ip}\n| game\n| ${notes}\n| [${source} Official announcement]\n`;
}

function wiki(...rows: string[]) {
  return `== 2026-11 ==\n{| class="wikitable"\n|-\n! Date !! Brand !! IP / Theme !! Circle !! Notes !! Sources\n|-\n${rows.join("|-\n")}|}`;
}

function revision(id: number, content?: string) {
  return new Response(JSON.stringify({
    query: { pages: [{ revisions: [{ revid: id, parentid: id - 1, timestamp: `2026-11-0${id === 10 ? 1 : 2}T01:10:22Z`, ...(content ? { slots: { main: { content } } } : {}) }] }] },
  }), { status: 200, headers: { "Content-Type": "application/json" } });
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
    startDate: "2026-11-02",
    endDate: null,
    endRule: null,
    announcedAt: "2026-11-02",
    summary: "联动饮品",
    tags: ["茶饮"],
    confidence: 0.95,
    evidenceQuotes: [],
    warnings: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.state.value = null;
  mocks.getImported.mockResolvedValue([]);
  mocks.prepareImages.mockResolvedValue({ content: [], tileCount: 0, totalBytes: 0, warnings: [] });
  mocks.fetchDetail.mockImplementation(async (url: string) => ({
    url,
    title: "来源详细公告",
    publishedAt: "2026-11-02",
    sourceName: "来源网站",
    sourceTier: "media",
    fetcher: "firecrawl",
    firecrawlAttempted: true,
    text: `来源网页的详细联动内容，包括活动时间、参与门店、套餐内容、周边规则、购买方式和注意事项。`.repeat(2) + url,
    images: [],
    relatedSources: [],
  }));
  mocks.extract.mockResolvedValue(draft());
  mocks.saveImported.mockResolvedValue({ collaboration: { id: "imported-wiki", title: "原神 × 喜茶" }, duplicate: false });
});

describe("ChineseFoodWiki wikitext parser", () => {
  it("parses six-column rows and preserves original source links", () => {
    const rows = parseChineseFoodWikiRows(wiki(row("2026-11-02", "喜茶", "Genshin Impact / 原神")));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ dateText: "2026-11-02", brand: "喜茶", ipTheme: "Genshin Impact / 原神" });
    expect(rows[0].sources[0]).toMatchObject({ url: "https://example.com/official", title: "Official announcement", tier: "media" });
  });
});

describe("ChineseFoodWiki revision synchronization", () => {
  it("creates a baseline without importing history or calling the model", async () => {
    mocks.fetch.mockResolvedValue(revision(10, wiki(row("2026-11-01", "瑞幸", "原神"))));

    const report = await syncChineseFoodWiki();

    expect(report).toMatchObject({ baseline: true, revisionId: 10, changedRows: 0, stateAdvanced: true, firecrawlUsed: false });
    expect(mocks.extract).not.toHaveBeenCalled();
    expect(mocks.saveImported).not.toHaveBeenCalled();
    expect(JSON.parse(mocks.state.value!).revisionId).toBe(10);
  });

  it("does not fetch wikitext or parse rows when the revision is unchanged", async () => {
    const content = wiki(row("2026-11-01", "瑞幸", "原神"));
    mocks.fetch.mockResolvedValueOnce(revision(10, content));
    await syncChineseFoodWiki();
    mocks.fetch.mockResolvedValueOnce(revision(10));

    const report = await syncChineseFoodWiki();

    expect(report.changedRows).toBe(0);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(mocks.extract).not.toHaveBeenCalled();
  });

  it("parses only the changed row and stores it with a stable row identity", async () => {
    const oldRow = row("2026-11-01", "瑞幸", "原神");
    const newRow = row("2026-11-02", "喜茶", "原神");
    const oldRows = parseChineseFoodWikiRows(wiki(oldRow));
    mocks.state.value = JSON.stringify({ source: "chinesefoodwiki", revisionId: 10, revisionTimestamp: "2026-11-01", rows: { [oldRows[0].key]: oldRows[0].hash } });
    mocks.fetch.mockResolvedValueOnce(revision(11)).mockResolvedValueOnce(revision(11, wiki(oldRow, newRow)));

    const report = await syncChineseFoodWiki();

    expect(report).toMatchObject({ changedRows: 1, stateAdvanced: true });
    expect(report.imported).toHaveLength(1);
    expect(mocks.extract).toHaveBeenCalledTimes(1);
    expect(mocks.extract.mock.calls[0][0].text).toContain("喜茶");
    expect(mocks.extract.mock.calls[0][0].text).not.toContain("瑞幸");
    expect(mocks.saveImported).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), expect.objectContaining({ latestForIp: "genshin", updateExisting: true }));
  });

  it("skips a wiki row that is not newer than the current record for that IP", async () => {
    const changed = row("2026-11-02", "喜茶", "原神");
    mocks.state.value = JSON.stringify({ source: "chinesefoodwiki", revisionId: 10, revisionTimestamp: "2026-11-01", rows: {} });
    mocks.fetch.mockResolvedValueOnce(revision(11)).mockResolvedValueOnce(revision(11, wiki(changed)));
    mocks.getImported.mockResolvedValue([{ id: "newer", ipIds: ["genshin"], startDate: "2026-11-10", announcedAt: "2026-11-10" }]);

    const report = await syncChineseFoodWiki();

    expect(report.skipped[0].reason).toBe("不晚于该 IP 当前最新记录");
    expect(mocks.fetchDetail).not.toHaveBeenCalled();
    expect(mocks.extract).not.toHaveBeenCalled();
    expect(mocks.saveImported).not.toHaveBeenCalled();
  });

  it("skips explicitly overseas rows without calling the model", async () => {
    const changed = row("2026-11-02", "日本品牌", "原神", "Region: Japan. Collab drinks.");
    mocks.state.value = JSON.stringify({ source: "chinesefoodwiki", revisionId: 10, revisionTimestamp: "2026-11-01", rows: {} });
    mocks.fetch.mockResolvedValueOnce(revision(11)).mockResolvedValueOnce(revision(11, wiki(changed)));

    const report = await syncChineseFoodWiki();

    expect(report.skipped[0].reason).toBe("非中国地区活动");
    expect(mocks.extract).not.toHaveBeenCalled();
  });

  it("manually enriches all sources for known IPs and skips unknown IPs before fetching", async () => {
    const unknown = row("2026-11-03", "品牌", "未知 IP");
    const known = row("2026-11-02", "喜茶", "原神").replace(
      "[https://example.com/official Official announcement]",
      "[https://example.com/1 One] · [https://example.com/2 Two] · [https://example.com/3 Three]",
    );
    mocks.state.value = JSON.stringify({ source: "chinesefoodwiki", revisionId: 10, revisionTimestamp: "2026-11-01", rows: {} });
    mocks.fetch.mockResolvedValue(revision(11, wiki(unknown, known)));

    const report = await syncChineseFoodWiki({ manual: true, limit: 2 });

    expect(report).toMatchObject({ manual: true, changedRows: 2, enrichedRows: 1, firecrawlUsed: true });
    expect(report.skipped[0].reason).toContain("未收录 IP");
    expect(mocks.fetchDetail).toHaveBeenCalledTimes(3);
    expect(mocks.extract).toHaveBeenCalledTimes(1);
    expect(mocks.saveImported).toHaveBeenCalledTimes(1);
  });

  it("resolves Endfield separately from Arknights without confusing Guanyuanji with Touhou", async () => {
    const guanyuanji = row("2026-09-29", "茉莉奶白", "Guanyuanji / 观园吉 (“守护东方”) ");
    const endfield = row("2026-09-20", "奈雪", "Arknights: Endfield / 明日方舟：终末地");
    mocks.state.value = JSON.stringify({ source: "chinesefoodwiki", revisionId: 10, revisionTimestamp: "2026-11-01", rows: {} });
    mocks.fetch.mockResolvedValue(revision(11, wiki(guanyuanji, endfield)));

    const report = await syncChineseFoodWiki({ manual: true, limit: 2 });

    expect(report.skipped.map((item) => item.reason)).toEqual(["未收录 IP：Guanyuanji / 观园吉 (“守护东方”)"]);
    expect(report.imported).toHaveLength(1);
    expect(mocks.fetchDetail).toHaveBeenCalledTimes(1);
    expect(mocks.extract).toHaveBeenCalledTimes(1);
    expect(mocks.saveImported).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ ipId: "arknights-endfield" }), expect.any(Object));
  });

  it("supports the Delta Force short alias and Taiwan region", async () => {
    const delta = row("2026-11-02", "TEA TOP", "Garena Delta Force / 三角洲", "Region: Taiwan. Collab drinks.");
    mocks.state.value = JSON.stringify({ source: "chinesefoodwiki", revisionId: 10, revisionTimestamp: "2026-11-01", rows: {} });
    mocks.fetch.mockResolvedValue(revision(11, wiki(delta)));

    const report = await syncChineseFoodWiki({ manual: true, limit: 1 });

    expect(report.imported).toHaveLength(1);
    expect(mocks.saveImported).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ ipId: "delta-force", region: "中国台湾" }), expect.any(Object));
  });

  it("keeps the previous revision cursor when row parsing fails so it can retry", async () => {
    const changed = row("2026-11-02", "喜茶", "原神");
    mocks.state.value = JSON.stringify({ source: "chinesefoodwiki", revisionId: 10, revisionTimestamp: "2026-11-01", rows: {} });
    mocks.fetch.mockResolvedValueOnce(revision(11)).mockResolvedValueOnce(revision(11, wiki(changed)));
    mocks.extract.mockRejectedValue(new Error("model unavailable"));

    const report = await syncChineseFoodWiki();

    expect(report.errors).toHaveLength(1);
    expect(report.stateAdvanced).toBe(false);
    expect(JSON.parse(mocks.state.value!).revisionId).toBe(10);
    expect(JSON.parse(mocks.state.value!).pendingRows).toHaveLength(1);

    mocks.extract.mockResolvedValue(draft());
    mocks.fetch.mockResolvedValueOnce(revision(11)).mockResolvedValueOnce(revision(11, wiki(changed)));
    const retry = await syncChineseFoodWiki();
    expect(retry.errors).toHaveLength(0);
    expect(retry.stateAdvanced).toBe(true);
    expect(JSON.parse(mocks.state.value!).pendingRows).toEqual([]);
  });
});
