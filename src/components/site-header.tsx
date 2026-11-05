import Link from "next/link";
import { Github, Radar } from "lucide-react";

export function SiteHeader() {
  const isGitHubPages = process.env.GITHUB_PAGES === "true";

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand" aria-label="联动雷达首页">
          <span className="brand__icon"><Radar size={21} strokeWidth={2.2} /></span>
          <span className="brand__lockup"><span className="brand__text">Collab<span>Radar</span></span><span className="brand__cn">联动雷达</span></span>
        </Link>
        <nav className="site-nav" aria-label="主导航">
          <Link href="/">联动时间线</Link>
          {!isGitHubPages && <Link href="/ingest">解析工作台</Link>}
          <Link href="/#about">数据说明</Link>
        </nav>
        <div className="site-header__actions">
          <span className="demo-pill"><span />PUBLIC DEMO</span>
          <a className="github-link" href="https://github.com/Reyotsed/acg-collab-radar" target="_blank" rel="noreferrer" aria-label="打开 CollabRadar GitHub 开源仓库"><Github size={17} /><span>开源仓库</span></a>
        </div>
      </div>
    </header>
  );
}
