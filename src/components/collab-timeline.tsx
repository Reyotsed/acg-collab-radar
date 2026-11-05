import Link from "next/link";
import { ArrowUpRight, CalendarRange, ExternalLink } from "lucide-react";
import { formatDate, formatDateRange, getCollabStatus } from "@/lib/collabs";
import { getIp } from "@/lib/data";
import { STATUS_LABELS, type CollabStatus, type Collaboration } from "@/lib/types";

function newestFirst(a: Collaboration, b: Collaboration) {
  return b.updatedAt.localeCompare(a.updatedAt) || b.startDate.localeCompare(a.startDate);
}

const groupCaptions: Record<string, string> = {
  ongoing: "现在就能参与",
  upcoming: "提前收藏时间",
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
          const primarySource = collab.sources[0];
          const [year, month, day] = collab.updatedAt.split("-");
          return (
            <article className={`simple-event simple-event--${actualStatus}`} key={collab.id}>
              <div className="simple-event__rail" aria-hidden="true">
                <div><strong>{month}.{day}</strong><span>{year}</span></div><i />
              </div>
              <div className="simple-event__card">
                <div className="simple-event__meta">
                  <span className={`simple-status simple-status--${actualStatus}`}><i />{STATUS_LABELS[actualStatus]}</span>
                  <span>更新于 <time dateTime={collab.updatedAt}>{formatDate(collab.updatedAt)}</time></span>
                </div>
                <h3>{showIp ? `${ipNames} × ${collab.brand}` : collab.title}</h3>
                <p className="simple-event__summary">{collab.summary}</p>
                <div className="simple-event__time">
                  <CalendarRange size={16} /><span>联动时间</span><strong>{formatDateRange(collab)}</strong>
                </div>
                <div className="simple-event__footer">
                  {primarySource && (
                    <a href={primarySource.url} target="_blank" rel="noreferrer" className="simple-source-link">
                      <span className={`evidence-tier evidence-tier--${primarySource.tier}`}>{primarySource.tier === "official" ? "官方" : "媒体"}</span>
                      <span>{primarySource.source}</span><ExternalLink size={13} />
                    </a>
                  )}
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
  const ended = items.filter((collab) => ["ended", "cancelled"].includes(getCollabStatus(collab))).sort(newestFirst);

  return (
    <div className="timeline-groups">
      <TimelineGroup title="正在进行" status="ongoing" items={ongoing} showIp={showIp} />
      <TimelineGroup title="即将开始" status="upcoming" items={upcoming} showIp={showIp} />
      <TimelineGroup title="已经结束" status="ended" items={ended} showIp={showIp} />
      {!ongoing.length && !upcoming.length && !ended.length && <div className="simple-empty">还没有收录联动消息。</div>}
    </div>
  );
}
