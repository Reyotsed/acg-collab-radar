import { describe, expect, it } from "vitest";
import { collaborations } from "@/lib/data";
import { keepOnlyLatestForIp } from "@/lib/imported-store";

describe("latest collaboration retention", () => {
  it("removes older records for the synchronized IP without touching other games", () => {
    const base = collaborations[0];
    const oldGenshin = { ...base, id: "old-genshin", ipIds: ["genshin"] };
    const latestGenshin = { ...base, id: "latest-genshin", ipIds: ["genshin"] };
    const zzz = { ...base, id: "latest-zzz", ipIds: ["zzz"] };

    const result = keepOnlyLatestForIp([oldGenshin, zzz, latestGenshin], "latest-genshin", "genshin");

    expect(result.map((item) => item.id)).toEqual(["latest-zzz", "latest-genshin"]);
  });
});
