import { describe, expect, it } from "vitest";
import { collaborations } from "@/lib/data";
import { keepOnlyLatestForIp, preferredExistingForIp } from "@/lib/imported-store";

describe("latest collaboration retention", () => {
  it("removes older records for the synchronized IP without touching other games", () => {
    const base = collaborations[0];
    const oldGenshin = { ...base, id: "old-genshin", ipIds: ["genshin"] };
    const latestGenshin = { ...base, id: "latest-genshin", ipIds: ["genshin"] };
    const zzz = { ...base, id: "latest-zzz", ipIds: ["zzz"] };

    const result = keepOnlyLatestForIp([oldGenshin, zzz, latestGenshin], "latest-genshin", "genshin");

    expect(result.map((item) => item.id)).toEqual(["latest-zzz", "latest-genshin"]);
  });

  it("keeps a newer Wiki record when an older official campaign arrives", () => {
    const base = collaborations[0];
    const newerWiki = { ...base, id: "newer-wiki", ipIds: ["genshin"], startDate: "2026-11-10", announcedAt: "2026-11-09" };
    const olderOfficial = { ...base, id: "older-official", ipIds: ["genshin"], startDate: "2026-10-01", announcedAt: "2026-11-11" };

    expect(preferredExistingForIp([newerWiki], olderOfficial, "genshin")?.id).toBe("newer-wiki");
    expect(preferredExistingForIp([newerWiki], { ...olderOfficial, startDate: "2026-11-12" }, "genshin")).toBeNull();
    expect(keepOnlyLatestForIp([newerWiki, olderOfficial], "older-official", "genshin")).toHaveLength(2);
  });
});
