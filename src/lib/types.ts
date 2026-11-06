export type CollabCategory = "tea" | "coffee" | "fastfood" | "cafe" | "food";
export type CollabStatus = "ongoing" | "upcoming" | "announced" | "ended" | "cancelled";
export type Timeline = "current" | "history" | "all";
export type SourceTier = "official" | "media";

export interface IpEntity {
  id: string;
  name: string;
  nativeName: string;
  englishName: string;
  aliases: string[];
  kind: "游戏" | "动画" | "漫画" | "角色";
  monogram: string;
  colors: [string, string, string];
}

export interface Evidence {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  tier: SourceTier;
}

export interface Collaboration {
  id: string;
  ipIds: string[];
  title: string;
  brand: string;
  brandShort: string;
  category: CollabCategory;
  region: "中国大陆" | "日本";
  location: string;
  startDate: string | null;
  endDate: string | null;
  endRule?: "while_supplies_last";
  announcedAt: string;
  updatedAt: string;
  summary: string;
  tags: string[];
  sources: Evidence[];
  statusOverride?: "ended" | "cancelled";
}

export interface HeatBreakdown {
  recency: number;
  activity: number;
  sources: number;
  campaigns: number;
}

export interface RecentIpSummary {
  ip: IpEntity;
  heat: number;
  heatBreakdown: HeatBreakdown;
  ongoingCount: number;
  upcomingCount: number;
  recentCount: number;
  sourceCount: number;
  latestAt: string;
  latestCollab: Collaboration;
}

export interface RecentQuery {
  q?: string;
  windowDays?: number;
  category?: string;
  region?: string;
  status?: string;
}

export const CATEGORY_LABELS: Record<CollabCategory, string> = {
  tea: "茶饮",
  coffee: "咖啡",
  fastfood: "快餐",
  cafe: "主题咖啡",
  food: "食品饮料",
};

export const STATUS_LABELS: Record<CollabStatus, string> = {
  ongoing: "正在进行",
  upcoming: "即将开始",
  announced: "日期待定",
  ended: "历史联动",
  cancelled: "已取消",
};
