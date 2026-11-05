import Link from "next/link";
import { ArrowUpRight, CalendarRange, ExternalLink } from "lucide-react";
import { formatDate, formatDateRange, getCollabStatus } from "@/lib/collabs";
import { getIp } from "@/lib/data";
import { STATUS_LABELS, type CollabStatus, type Collaboration } from "@/lib/types";

function newestFirst(a: Collaboration, b: Collaboration) {
  return b.updatedAt.localeCompare(a.updatedAt) || (b.startDate ?? "").localeCompare(a.startDate ?? "");
}

const groupCaptions: Record<string, string> = {
  ongoing: "现在就能参与",
  upcoming: "提前收藏时间",
  announced: "时间尚未官宣",
  ended: "往期联动存档",
};

interface TimelineGroupProps {
  title: string;
  status: CollabStatus;
  items: Collaboration[];
  showIp: boolean;
}

function TimelineGroup({ title, status, items, showIp }: TimelineGroupProps) {
  if (!items.length) return null;
  return (
    <section className={`timeline-group timeline-group--${status}`} id={`timeline-${status}`}>
      <div className="timeline-group__heading">
        <div><span className="timeline-group__marker" /><h2>{title}</h2><span className="timeline-group__count">{items.length}</span></div>
        <p>{groupCaptions[status]}</p>
      </div>
      <div className="simple-timeline">
        {items.map((collab) => {
          const actualStatus = getCollabStatus(collab);
          const ipNames = collab.ipIds.map((id) => getIp(id)?.name).filter(Boolean).join("、");
          const isDemo = !collab.id.startsWith("imported-");
          const [year, month, day] = collab.updatedAt.split("-");
          return (
            <article className={`simple-event simple-event--${actualStatus}`} key={collab.id}>
              <div className="simple-event__rail" aria-hidden="true">
                <div><strong>{month}.{day}</strong><span>{year}</span></div><i />
              </div>
              <div className="simple-event__card">
                <div className="simple-event__meta">
                  <div className="simple-event__badges">
                    <span className={`simple-status simple-status--${actualStatus}`}><i />{STATUS_LABELS[actualStatus]}</span>
                    {isDemo && <span className="demo-record" title="静态演示记录，不用于验证官方来源同步">演示快照</span>}
                  </div>
                  <span>更新于 <time dateTime={collab.updatedAt}>{formatDate(collab.updatedAt)}</time></span>
                </div>
                <h3>{showIp ? `${ipNames} × ${collab.brand}` : collab.title}</h3>
                <p className="simple-event__summary">{collab.summary}</p>
                <div className="simple-event__time">
                  <CalendarRange size={16} /><span>联动时间</span><strong>{formatDateRange(collab)}</strong>
                </div>
                <div className="simple-event__footer">
                  <div className="simple-event__sources">
                    {collab.sources.slice(0, 2).map((source) => (
                      <a href={source.url} target="_blank" rel="noreferrer" className="simple-source-link" key={source.url}>
                        <span className={`evidence-tier evidence-tier--${source.tier}`}>{source.tier === "official" ? "官方" : "媒体"}</span>
                        <span>{source.source}</span><ExternalLink size={13} />
                      </a>
                    ))}
                  </div>
                  {showIp && collab.ipIds[0] && <Link href={`/ip/${collab.ipIds[0]}`} className="simple-ip-link">查看 IP 档案<ArrowUpRight size={14} /></Link>}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function CollabTimeline({ items, showIp = true }: { items: Collaboration[]; showIp?: boolean }) {
  const ongoing = items.filter((collab) => getCollabStatus(collab) === "ongoing").sort(newestFirst);
  const upcoming = items.filter((collab) => getCollabStatus(collab) === "upcoming").sort(newestFirst);
  const announced = items.filter((collab) => getCollabStatus(collab) === "announced").sort(newestFirst);
  const ended = items.filter((collab) => ["ended", "cancelled"].includes(getCollabStatus(collab))).sort(newestFirst);

  return (
    <div className="timeline-groups">
      <TimelineGroup title="正在进行" status="ongoing" items={ongoing} showIp={showIp} />
      <TimelineGroup title="即将开始" status="upcoming" items={upcoming} showIp={showIp} />
      <TimelineGroup title="日期待定" status="announced" items={announced} showIp={showIp} />
      <TimelineGroup title="已经结束" status="ended" items={ended} showIp={showIp} />
      {!ongoing.length && !upcoming.length && !announced.length && !ended.length && <div className="simple-empty">还没有收录联动消息。</div>}
    </div>
  );
}
