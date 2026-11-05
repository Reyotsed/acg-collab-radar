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
    expect(getIpTimeline("genshin", "history").map((item) => item.id)).toContain("genshin-heytea-2023");
    expect(getIpTimeline("genshin", "current").map((item) => item.id)).not.toContain("genshin-heytea-2023");
  });
});
