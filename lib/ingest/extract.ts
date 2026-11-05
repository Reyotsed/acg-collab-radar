import { z } from "zod";
import { ips } from "@/lib/data";
import { fetchPublic } from "./http";
import type { CollabDraft, RawAnnouncement } from "./types";

const draftSchema = z.object({
  isCollab: z.boolean().default(true),
  ipId: z.string().default(""),
  ipName: z.string().min(1),
  title: z.string().min(1),
  brand: z.string().min(1),
  category: z.enum(["tea", "coffee", "fastfood", "cafe", "food"]),
  region: z.enum(["中国大陆", "日本"]),
  location: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  announcedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  summary: z.string().min(1),
  tags: z.array(z.string()).max(8).default([]),
  confidence: z.number().min(0).max(1),
  evidenceQuotes: z.array(z.string()).max(10).default([]),
  warnings: z.array(z.string()).default([]),
});

const systemPrompt = `你是二次元餐饮商业联动公告解析器。阅读公告正文和按顺序排列的海报图片，输出一个 JSON 对象，不要 Markdown。
字段：isCollab, ipId, ipName, title, brand, category, region, location, startDate, endDate, announcedAt, summary, tags, confidence, evidenceQuotes, warnings。
规则：
1. isCollab 只用于判断公告是否属于与餐饮品牌、食品饮品、餐饮门店或主题咖啡相关的商业联动；普通游戏活动、祈愿、创作者合作和非餐饮合作填 false。
2. category 只能是 tea/coffee/fastfood/cafe/food；region 只能是中国大陆或日本。
3. 日期使用 YYYY-MM-DD。公告发布日期是 announcedAt，绝不能把网站展示有效期当作活动结束日期。
4. 未明确公布的日期填 null，不得猜测。跨阶段活动以主要联动企划的起止时间为准，并在 summary 中补充阶段信息。
5. ipId 只能从用户提供的候选 ID 中选择；无法确定时填空字符串，ipName 填公告中的名称。
6. 摘要不虚构菜单、门店、周边或规则。evidenceQuotes 只放公告或海报中真实存在的短句。
7. confidence 为 0 到 1，表示整条解析结果的可靠程度。存在歧义时写入 warnings。`;

export async function extractCollab(raw: RawAnnouncement, imageContent: unknown[]): Promise<CollabDraft> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("未配置 DEEPSEEK_API_KEY");
  const model = process.env.DEEPSEEK_MODEL || "deepseek-flash";
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
  const candidates = ips.map((ip) => ({ id: ip.id, name: ip.name, aliases: ip.aliases }));
  const instruction = `公告元数据：${JSON.stringify({ title: raw.title, publishedAt: raw.publishedAt, source: raw.sourceName, url: raw.url })}
候选 IP：${JSON.stringify(candidates)}
公告正文：${raw.text || "（正文为空，主要信息在图片中）"}
请按顺序阅读随后的 ${imageContent.length} 张图片或图片切片，再输出 JSON。`;

  const response = await fetchPublic(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: [{ type: "text", text: instruction }, ...imageContent] },
      ],
    }),
  }, 180_000);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`DeepSeek 返回 ${response.status}：${message.slice(0, 300)}`);
  }
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek 未返回解析内容");
  const normalized = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const result = draftSchema.safeParse(JSON.parse(normalized));
  if (!result.success) throw new Error(`模型输出字段不完整：${result.error.issues[0]?.message ?? "未知校验错误"}`);
  return result.data;
}
