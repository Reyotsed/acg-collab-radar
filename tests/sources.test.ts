import { describe, expect, it } from "vitest";
import { parseAnnouncementHtml } from "@/lib/ingest/html";
import { getOfficialSourceByHostname, officialSources } from "@/lib/sources/registry";
import { isCollabCandidate } from "@/lib/sources/sync";

describe("official source registry", () => {
  it("registers the five verified game sources with unique IDs", () => {
    expect(officialSources.map((source) => source.id)).toEqual(["genshin", "hsr", "bh3", "zzz", "arknights"]);
    expect(new Set(officialSources.map((source) => source.ipId)).size).toBe(5);
  });

  it.each([
    ["ys.mihoyo.com", "genshin"],
    ["sr.mihoyo.com", "hsr"],
    ["bh3.mihoyo.com", "bh3"],
    ["zzz.mihoyo.com", "zzz"],
    ["ak.hypergryph.com", "arknights"],
  ])("maps %s to the correct official source", (hostname, id) => {
    expect(getOfficialSourceByHostname(hostname)?.id).toBe(id);
  });
});

describe("collaboration candidate prefilter", () => {
  it.each(["绝区零 x KFC联动PV", "明日方舟携手合作伙伴肯德基", "瑞幸联名活动开启"])("accepts %s", (title) => {
    expect(isCollabCandidate(title)).toBe(true);
  });

  it("rejects routine game updates", () => {
    expect(isCollabCandidate("全新角色演示与版本维护公告")).toBe(false);
  });
});

describe("announcement HTML parsing", () => {
  it("extracts images and video posters while removing scripts", () => {
    const result = parseAnnouncementHtml('<html><body><h1>联动公告</h1><script>bad()</script><img src="/cover.jpg"><video poster="https://cdn.example.com/poster.jpg"></video><p>活动时间</p></body></html>', "https://game.example.com/news/1");
    expect(result.title).toBe("联动公告");
    expect(result.images).toEqual(["https://game.example.com/cover.jpg", "https://cdn.example.com/poster.jpg"]);
    expect(result.text).toContain("活动时间");
    expect(result.text).not.toContain("bad()");
  });
});
