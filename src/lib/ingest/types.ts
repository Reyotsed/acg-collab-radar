import type { CollabCategory, Evidence, SourceTier } from "@/lib/types";

export interface RawAnnouncement {
  url: string;
  title: string;
  publishedAt: string;
  sourceName: string;
  sourceTier: SourceTier;
  fetcher: "mihoyo-api" | "mihoyo-content-v2" | "official-html" | "mediawiki-api" | "firecrawl" | "direct-http";
  text: string;
  images: string[];
  relatedSources?: Evidence[];
}

export interface CollabDraft {
  isCollab: boolean;
  ipId: string;
  ipName: string;
  title: string;
  brand: string;
  category: CollabCategory;
  region: "中国大陆" | "日本";
  location: string;
  startDate: string | null;
  endDate: string | null;
  endRule: "while_supplies_last" | null;
  announcedAt: string;
  summary: string;
  tags: string[];
  confidence: number;
  evidenceQuotes: string[];
  warnings: string[];
}

export interface PreparedImages {
  content: unknown[];
  tileCount: number;
  totalBytes: number;
  warnings: string[];
}

export interface IngestResult {
  raw: RawAnnouncement;
  draft: CollabDraft;
  warnings: string[];
  processing: {
    imageCount: number;
    imageTiles: number;
    model: string;
  };
}
