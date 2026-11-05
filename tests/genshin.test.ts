import { describe, expect, it } from "vitest";
import { isGenshinCollabCandidate } from "@/lib/sources/genshin";

describe("Genshin collaboration keyword prefilter", () => {
  it.each([
    "「至冬特派，冰爽随行」原神 × 美团丨大众点评 联名活动正式开启",
    "肯德基×原神联动现已开启",
    "原神品牌合作公告",
  ])("accepts %s", (title) => {
    expect(isGenshinCollabCandidate(title)).toBe(true);
  });

  it.each([
    "《原神》「神铸赋形」活动祈愿现已开启",
    "【7.2】版本创作者激励计划即将开启",
    "全新角色演示公开",
  ])("rejects %s", (title) => {
    expect(isGenshinCollabCandidate(title)).toBe(false);
  });
});
