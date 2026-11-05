import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { DEMO_REFERENCE_DATE } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "联动雷达 · ACG Collab Radar",
    template: "%s · 联动雷达",
  },
  description: "发现二次元 IP 的最新联动，查询当前与历史联动记录。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <SiteHeader />
        <main>{children}</main>
        <footer className="site-footer" id="about">
          <div>
            <strong>CollabRadar</strong>
            <span>让每一次梦幻联动，都有迹可循。</span>
          </div>
          <p>包含 {DEMO_REFERENCE_DATE} 静态演示快照与定时同步记录；每天重建两次，非秒级实时查询。</p>
        </footer>
      </body>
    </html>
  );
}
