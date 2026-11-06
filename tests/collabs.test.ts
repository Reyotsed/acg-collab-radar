import { describe, expect, it } from "vitest";
import { formatDateRange, getCollabStatus, getIpTimeline, getRecentIpSummaries } from "@/lib/collabs";
import { collaborations } from "@/lib/data";

 describe("collaboration status", () => {
  it("distinguishes ongoing, upcoming and ended records", () => {
    const ongoing = collaborations.find((item) => item.id === "touhou-curemaid-2026")!;
    const upcoming = collaborations.find((item) => item.id === "sakura-treevillage-2026")!;
    const ended = collaborations.find((item) => item.id === "miku-bullpulu-2026")!;
    expect(getCollabStatus(ongoing)).toBe("ongoing");
    expect(getCollabStatus(upcoming)).toBe("upcoming");
    expect(getCollabStatus(ended)).toBe("ended");
  });

  it("keeps an unknown end date explicit", () => {
    const collab = collaborations.find((item) => item.id === "kpl-luckin-2026")!;
    expect(getCollabStatus(collab)).toBe("ongoing");
    expect(formatDateRange(collab)).toContain("结束时间未官宣");
  });

  it("keeps undated official announcements without inventing dates", () => {
    const collab = { ...collaborations[0], id: "imported-undated", startDate: null, endDate: null };
    expect(getCollabStatus(collab)).toBe("announced");
    expect(formatDateRange(collab)).toBe("活动时间未官宣");
    expect(getIpTimeline("honor-of-kings", "current", [collab]).map((item) => item.id)).toContain("imported-undated");
  });

  it("moves while-supplies-last campaigns to history after a default month", () => {
    const collab = { ...collaborations[0], id: "imported-stock", startDate: "2026-01-01", endDate: null, endRule: "while_supplies_last" as const };
    expect(getCollabStatus(collab)).toBe("ended");
    expect(formatDateRange(collab)).toBe("2026.01.01 — 2026.02.01（默认截止）");
    expect(getIpTimeline("honor-of-kings", "history", [collab]).map((item) => item.id)).toContain("imported-stock");
    expect(getIpTimeline("honor-of-kings", "current", [collab]).map((item) => item.id)).not.toContain("imported-stock");
  });

  it("keeps while-supplies-last campaigns current during the default month", () => {
    const collab = { ...collaborations[0], id: "imported-stock-current", startDate: "2026-10-15", endDate: null, endRule: "while_supplies_last" as const };
    expect(getCollabStatus(collab)).toBe("ongoing");
    expect(formatDateRange(collab)).toContain("2026.11.15（默认截止）");
  });
});

describe("IP radar queries", () => {
  it.each(["Chiikawa", "ちいかわ", "吉伊卡哇", "小可爱"])("resolves the alias %s to one IP", (alias) => {
    const result = getRecentIpSummaries({ q: alias });
    expect(result).toHaveLength(1);
    expect(result[0].ip.id).toBe("chiikawa");
  });

  it("sorts every result by descending heat", () => {
    const result = getRecentIpSummaries();
    expect(result.length).toBeGreaterThan(5);
    for (let index = 1; index < result.length; index += 1) {
      expect(result[index - 1].heat).toBeGreaterThanOrEqual(result[index].heat);
    }
  });

  it("separates current collaborations from history", () => {
    expect(getIpTimeline("genshin", "current").map((item) => item.id)).toContain("genshin-baskin-2026");
    expect(getIpTimeline("hatsune-miku", "history").map((item) => item.id)).toContain("miku-bullpulu-2026");
    expect(getIpTimeline("hatsune-miku", "current").map((item) => item.id)).not.toContain("miku-bullpulu-2026");
  });
});
