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

  return (
    <div className="simple-home container">
      <div className="breadcrumb"><Link href="/"><ChevronLeft size={16} />返回联动时间线</Link><span>/</span><span>{ip.name}</span></div>
      <section className="simple-home__header simple-ip-header">
        <span className="simple-ip-header__kind">{ip.kind} IP</span>
        <h1>{ip.name}</h1>
        <p>{ip.nativeName} · {ip.englishName}</p>
        <div className="simple-home__stats">
          <span><i className="status-dot status-dot--ongoing" />{ongoing} 个进行中</span>
          <span><i className="status-dot status-dot--upcoming" />{upcoming} 个即将开始</span>
          <span>{domestic.length} 条联动记录</span>
        </div>
      </section>
      <CollabTimeline items={domestic} showIp={false} />
    </div>
  );
}
