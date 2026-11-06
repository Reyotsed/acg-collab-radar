import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { getIp } from "./data";
import type { Collaboration } from "./types";
import type { CollabDraft, RawAnnouncement } from "./ingest/types";

const dataFile = process.env.DATA_FILE || path.join(process.cwd(), "data", "imported-collabs.json");

export async function getImportedCollaborations(): Promise<Collaboration[]> {
  try {
    const content = await readFile(/* turbopackIgnore: true */ dataFile, "utf8");
    return JSON.parse(content) as Collaboration[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeImportedCollaborations(collaborations: Collaboration[]) {
  await mkdir(/* turbopackIgnore: true */ path.dirname(dataFile), { recursive: true });
  const temporary = `${dataFile}.tmp`;
  await writeFile(/* turbopackIgnore: true */ temporary, `${JSON.stringify(collaborations, null, 2)}\n`, "utf8");
  await rename(/* turbopackIgnore: true */ temporary, dataFile);
}

export function keepOnlyLatestForIp(items: Collaboration[], keepId: string, ipId: string) {
  return items.filter((item) => item.id === keepId || !item.ipIds.includes(ipId));
}

interface SaveCollaborationOptions {
  latestForIp?: string;
  stableId?: string;
  updateExisting?: boolean;
}

export async function saveImportedCollaboration(raw: RawAnnouncement, draft: CollabDraft, options: SaveCollaborationOptions = {}) {
  if (draft.isCollab === false) throw new Error("该公告不属于餐饮联动，未写入联动档案");
  const ip = getIp(draft.ipId);
  if (!ip) throw new Error("请选择已收录的 IP");
  if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) throw new Error("结束日期不能早于开始日期");

  const id = `imported-${createHash("sha1").update(options.stableId ?? raw.url).digest("hex").slice(0, 12)}`;
  const collaboration: Collaboration = {
    id,
    ipIds: [ip.id],
    title: draft.title.trim(),
    brand: draft.brand.trim(),
    brandShort: draft.brand.trim().slice(0, 1),
    category: draft.category,
    region: draft.region,
    location: draft.location.trim(),
    startDate: draft.startDate,
    endDate: draft.endDate,
    endRule: draft.endRule ?? undefined,
    announcedAt: draft.announcedAt || raw.publishedAt,
    updatedAt: draft.announcedAt || raw.publishedAt,
    summary: draft.summary.trim(),
    tags: draft.tags.filter(Boolean),
    sources: [{
      title: raw.title,
      source: raw.sourceName,
      url: raw.url,
      publishedAt: raw.publishedAt || draft.announcedAt,
      tier: raw.sourceTier,
    }, ...(raw.relatedSources ?? [])],
  };

  const existing = await getImportedCollaborations();
  const duplicate = existing.find((item) => item.id === id || item.sources.some((source) => source.url === raw.url));
  if (duplicate) {
    if (options.updateExisting) {
      const sources = [...collaboration.sources, ...duplicate.sources]
        .filter((source, index, all) => all.findIndex((item) => item.url === source.url) === index);
      const updated = { ...collaboration, id: duplicate.id, sources };
      const replaced = existing.map((item) => item.id === duplicate.id ? updated : item);
      const next = options.latestForIp ? keepOnlyLatestForIp(replaced, duplicate.id, options.latestForIp) : replaced;
      await writeImportedCollaborations(next);
      return { collaboration: updated, duplicate: true };
    }
    if (options.latestForIp) {
      const next = keepOnlyLatestForIp(existing, duplicate.id, options.latestForIp);
      if (next.length !== existing.length) await writeImportedCollaborations(next);
    }
    return { collaboration: duplicate, duplicate: true };
  }
  const retained = options.latestForIp
    ? keepOnlyLatestForIp(existing, id, options.latestForIp)
    : existing;
  await writeImportedCollaborations([...retained, collaboration]);
  return { collaboration, duplicate: false };
}
