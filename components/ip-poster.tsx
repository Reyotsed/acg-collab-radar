import type { CSSProperties } from "react";
import type { IpEntity } from "@/lib/types";

interface IpPosterProps {
  ip: IpEntity;
  size?: "small" | "medium" | "large";
}

export function IpPoster({ ip, size = "medium" }: IpPosterProps) {
  const style = {
    "--poster-from": ip.colors[0],
    "--poster-to": ip.colors[1],
    "--poster-accent": ip.colors[2],
  } as CSSProperties;

  return (
    <div className={`ip-poster ip-poster--${size}`} style={style} aria-hidden="true">
      <span className="poster-grid" />
      <span className="poster-orbit poster-orbit--one" />
      <span className="poster-orbit poster-orbit--two" />
      <span className="poster-kind">{ip.kind}</span>
      <span className="poster-monogram">{ip.monogram}</span>
      <span className="poster-name">{ip.englishName}</span>
    </div>
  );
}
