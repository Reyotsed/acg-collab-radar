import Link from "next/link";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { formatDate, formatDateRange, getCollabStatus } from "@/lib/collabs";
import { getIp } from "@/lib/data";
import { STATUS_LABELS, type CollabStatus, type Collaboration } from "@/lib/types";

function newestFirst(a: Collaboration, b: Collaboration) {
  return b.updatedAt.localeCompare(a.updatedAt) || b.startDate.localeCompare(a.startDate);
}

function TimelineGroup({ title, status, items, showIp }: { title: string; status: CollabStatus; items: Collaboration[]; showIp: boolean }) {
  if (!items.length) return null;
  return (
    <section className="timeline-group">
      <div className="timeline-group__heading"><h2>{title}</h2><span>{items.length} 条</span></div>
      <div className="simple-timeline">
        {items.map((collab) => {
          const ipNames = collab.ipIds.map((id) => getIp(id)?.name).filter(Boolean).join("、");
          const primarySource = collab.sources[0];
          return (
            <div className={`simple-event simple-event--${status}`} key={collab.id}>
              <div className="simple-event__rail"><span /></div>
              <article className="simple-event__card">
                <div className="simple-event__meta">
                  <span className={`simple-status simple-status--${status}`}><i />{STATUS_LABELS[status]}</span>
                  <span>{formatDate(collab.updatedAt)} 更新</span>
                </div>
                <h3>{showIp ? `${ipNames} × ${collab.brand}` : collab.title}</h3>
                <p className="simple-event__time"><span>联动时间</span>{formatDateRange(collab)}</p>
                <div className="simple-event__footer">
                  {primarySource && (
                    <a href={primarySource.url} target="_blank" rel="noreferrer" className="simple-source-link">
                      <span className={`evidence-tier evidence-tier--${primarySource.tier}`}>{primarySource.tier === "official" ? "官方" : "媒体"}</span>
                      {primarySource.source}<ExternalLink size={13} />
                    </a>
                  )}
                  {showIp && collab.ipIds[0] && <Link href={`/ip/${collab.ipIds[0]}`} className="simple-ip-link">查看 IP 档案<ArrowUpRight size={13} /></Link>}
                </div>
              </article>
            </div>
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
