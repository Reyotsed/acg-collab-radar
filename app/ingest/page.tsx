import type { Metadata } from "next";
import { IngestWorkbench } from "@/components/ingest-workbench";

export const metadata: Metadata = { title: "公告解析工作台" };

export default function IngestPage() {
  return <IngestWorkbench />;
}
