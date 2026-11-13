import { syncChineseFoodWiki } from "./chinesefoodwiki";
import { officialSources } from "./registry";
import { syncOfficialSources } from "./sync";
import { syncWebDiscovery } from "./web-discovery";
import type { SourceId } from "./types";

export const monitoredSourceIds = [...officialSources.map((source) => source.id), "chinesefoodwiki", "web-discovery"] as const;
export type MonitoredSourceId = typeof monitoredSourceIds[number];

export async function syncMonitoredSources(requested?: MonitoredSourceId, options: { wikiManual?: boolean; wikiLimit?: number | "all"; wikiSourceLimit?: number | "all" } = {}) {
  const officialIds: SourceId[] | undefined = requested && requested !== "chinesefoodwiki" && requested !== "web-discovery" ? [requested] : undefined;
  const reports = !requested || officialIds
    ? await syncOfficialSources(officialIds)
    : [];
  const chineseFoodWiki = !requested || requested === "chinesefoodwiki"
    ? await syncChineseFoodWiki({ manual: options.wikiManual, limit: options.wikiLimit, sourceLimit: options.wikiSourceLimit })
    : null;
  const webDiscovery = !requested || requested === "web-discovery"
    ? await syncWebDiscovery({ force: requested === "web-discovery" })
    : null;
  return { reports, chineseFoodWiki, webDiscovery };
}
