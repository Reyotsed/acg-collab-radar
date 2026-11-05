import type { Metadata } from "next";
import Link from "next/link";
import { Radar } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { DEMO_REFERENCE_DATE } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "联动雷达 · ACG Collab Radar",
    template: "%s · 联动雷达",
  },
  description: "发现二次元 IP 的餐饮联动，查询当前与历史联动记录并追溯公告来源。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <SiteHeader />
        <main>{children}</main>
        <footer className="site-footer" id="about">
          <div className="site-footer__inner container">
            <div className="site-footer__about">
              <div className="site-footer__brand"><span className="brand__icon"><Radar size={18} /></span><strong>CollabRadar</strong><span>联动雷达</span></div>
              <p>让每一次梦幻联动，都有迹可循。公开信息仅用于产品演示与资料整理，活动规则以原始公告为准。</p>
            </div>
            <div className="site-footer__links">
              <a href="https://github.com/Reyotsed/acg-collab-radar" target="_blank" rel="noreferrer">项目仓库</a>
              <a href="https://github.com/Reyotsed/acg-collab-radar/issues" target="_blank" rel="noreferrer">信息纠错</a>
              <Link href="/#timeline">联动时间线</Link>
            </div>
          </div>
          <div className="site-footer__bottom container">
            <span>© 2026 CollabRadar</span>
            <p>包含 {DEMO_REFERENCE_DATE} 静态演示快照与定时同步记录；每天重建两次，非秒级实时查询。</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
