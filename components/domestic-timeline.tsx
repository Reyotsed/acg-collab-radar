import { RadioTower } from "lucide-react";
import { CollabTimeline } from "./collab-timeline";
import { getCollabStatus } from "@/lib/collabs";
import { collaborations } from "@/lib/data";
import type { Collaboration } from "@/lib/types";

export function DomesticTimeline({ imported = [] }: { imported?: Collaboration[] }) {
  const items = [...collaborations, ...imported].filter((collab) => collab.region === "中国大陆");
  const ongoing = items.filter((collab) => getCollabStatus(collab) === "ongoing").length;
  const upcoming = items.filter((collab) => getCollabStatus(collab) === "upcoming").length;
  const latestUpdate = items.map((collab) => collab.updatedAt).sort().at(-1);

  return (
    <div className="simple-home container">
      <section className="simple-home__header">
        <div className="eyebrow"><RadioTower size={15} /> CHINA ACG COLLAB TIMELINE</div>
        <h1>国内二次元联动</h1>
        <p>只记录联动本身。正在进行优先，其余按消息时间从新到旧排列。</p>
        <div className="simple-home__stats">
          <span><i className="status-dot status-dot--ongoing" />{ongoing} 个进行中</span>
          <span><i className="status-dot status-dot--upcoming" />{upcoming} 个即将开始</span>
          <span>{items.length} 条联动记录</span>
          {latestUpdate && <span>更新至 {latestUpdate.replaceAll("-", ".")}</span>}
        </div>
      </section>
      <CollabTimeline items={items} />
    </div>
  );
}
