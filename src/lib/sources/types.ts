export type SourceId = "genshin" | "hsr" | "bh3" | "zzz" | "arknights";
export type SourceKind = "mihoyo" | "arknights";

export interface SourceNewsItem {
  id: string;
  title: string;
  signature: string;
  publishedAt: string;
}

export interface MihoyoSourceConfig {
  apiBase: string;
  channelId: number;
  iAppId?: string;
}

export interface OfficialSourceDefinition {
  id: SourceId;
  kind: SourceKind;
  ipId: string;
  ipName: string;
  sourceName: string;
  matches(hostname: string): boolean;
  list(page: number): Promise<SourceNewsItem[]>;
  detailUrl(id: string): string;
  mihoyo?: MihoyoSourceConfig;
}

export interface SourceSyncReport {
  source: SourceId;
  ipName: string;
  pagesScanned: number;
  itemsScanned: number;
  newIdCount: number;
  ignoredCount: number;
  candidates: Array<{ id: string; title: string; page: number; status: "imported" | "rejected"; reason?: string }>;
  result: null | { id: string; title: string; duplicate: boolean; startDate: string | null; endDate: string | null };
  stoppedAt: null | { page: number; id: string; title: string };
  stopReason?: "latest-collab-saved" | "latest-already-synced" | "lookback-limit";
  error?: string;
}
