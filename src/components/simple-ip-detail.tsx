import type { CSSProperties } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CollabTimeline } from "./collab-timeline";
import { getCollabStatus, getIpDetail } from "@/lib/collabs";

type Detail = NonNullable<ReturnType<typeof getIpDetail>>;

export function SimpleIpDetail({ detail }: { detail: Detail }) {
  const { ip } = detail;
  const domestic = detail.all.filter((collab) => collab.region === "中国大陆");
  const ongoing = domestic.filter((collab) => getCollabStatus(collab) === "ongoing").length;
  const upcoming = domestic.filter((collab) => getCollabStatus(collab) === "upcoming").length;
  const heroStyle = {
    "--ip-from": ip.colors[0],
    "--ip-to": ip.colors[1],
    "--ip-accent": ip.colors[2],
  } as CSSProperties;

  return (
    <div className="ip-page container">
      <div className="breadcrumb"><Link href="/"><ChevronLeft size={16} />返回联动时间线</Link><span>/</span><span>{ip.name}</span></div>
      <section className="ip-hero" style={heroStyle}>
        <div className="ip-hero__monogram"><span>{ip.monogram}</span><small>{ip.kind} IP</small></div>
        <div className="ip-hero__main">
          <span className="ip-hero__eyebrow">IP COLLABORATION ARCHIVE</span>
          <h1>{ip.name}</h1>
          <p>{ip.nativeName} · {ip.englishName}</p>
          <div className="ip-hero__aliases">{ip.aliases.slice(0, 4).map((alias) => <span key={alias}>{alias}</span>)}</div>
        </div>
        <div className="ip-hero__stats">
          <div><strong>{ongoing}</strong><span>正在进行</span></div>
          <div><strong>{upcoming}</strong><span>即将开始</span></div>
          <div><strong>{domestic.length}</strong><span>国内联动记录</span></div>
        </div>
      </section>
      <section className="ip-records">
        <div className="section-intro">
          <div><span className="section-kicker">COLLABORATION HISTORY</span><h2>联动档案</h2></div>
          <p>仅展示中国大陆餐饮联动。<br />按当前状态与消息时间整理。</p>
        </div>
        <CollabTimeline items={domestic} showIp={false} />
      </section>
    </div>
  );
}
