import { ArrowDown, ArrowUpRight, RadioTower } from "lucide-react";
import { CollabTimeline } from "./collab-timeline";
import { collaborations } from "@/lib/data";
import type { Collaboration } from "@/lib/types";

export function DomesticTimeline({ imported = [] }: { imported?: Collaboration[] }) {
  const items = [...collaborations, ...imported].filter((collab) => collab.region !== "日本");

  return (
    <div className="home-page">
      <section className="home-hero container">
        <div className="home-hero__copy">
          <div className="eyebrow"><RadioTower size={15} /> CHINA ACG COLLAB RADAR</div>
          <h1>国内二次元<br /><span>联动时间线</span></h1>
          <p>追踪茶饮、咖啡、快餐与主题餐厅合作。把散落在公告里的联动，整理成一条清晰、可追溯的时间线。</p>
          <div className="home-hero__actions">
            <a href="#timeline" className="button button--primary">浏览联动<ArrowDown size={16} /></a>
            <a href="#about" className="button button--quiet">了解数据规则<ArrowUpRight size={15} /></a>
          </div>
        </div>
      </section>

      <section className="home-content container" id="timeline">
        <div className="section-intro">
          <div><span className="section-kicker">CURATED TIMELINE</span><h2>联动记录</h2></div>
          <p>正在进行优先，其余按消息时间从新到旧排列。<br />来源链接直达原始公告。</p>
        </div>
        <CollabTimeline items={items} />
      </section>
    </div>
  );
}
