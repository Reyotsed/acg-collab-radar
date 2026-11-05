import Link from "next/link";
import { Radar } from "lucide-react";

export default function NotFound() {
  return (
    <div className="empty-state" style={{ maxWidth: 620, margin: "80px auto" }}>
      <span><Radar size={28} /></span>
      <h3>没有找到这个 IP 或页面</h3>
      <p>它可能尚未被收录到当前演示快照中。</p>
      <Link href="/" style={{ display: "inline-block", marginTop: 20, color: "var(--violet)", fontSize: 13 }}>返回联动时间线</Link>
    </div>
  );
}
