import { syncChineseFoodWiki } from "./chinesefoodwiki";
import { officialSources } from "./registry";
import { syncOfficialSources } from "./sync";
import type { SourceId } from "./types";

export const monitoredSourceIds = [...officialSources.map((source) => source.id), "chinesefoodwiki"] as const;
export type MonitoredSourceId = typeof monitoredSourceIds[number];

export async function syncMonitoredSources(requested?: MonitoredSourceId, options: { wikiManual?: boolean; wikiLimit?: number | "all"; wikiSourceLimit?: number | "all" } = {}) {
  const officialIds: SourceId[] | undefined = requested && requested !== "chinesefoodwiki" ? [requested] : undefined;
  const reports = !requested || requested !== "chinesefoodwiki"
    ? await syncOfficialSources(officialIds)
    : [];
  const chineseFoodWiki = !requested || requested === "chinesefoodwiki"
    ? await syncChineseFoodWiki({ manual: options.wikiManual, limit: options.wikiLimit, sourceLimit: options.wikiSourceLimit })
    : null;
  return { reports, chineseFoodWiki };
}
