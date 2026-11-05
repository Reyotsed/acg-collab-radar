import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SimpleIpDetail } from "../../../components/simple-ip-detail";
import { getIpDetail } from "@/lib/collabs";
import { getImportedCollaborations } from "@/lib/imported-store";
import { ips } from "@/lib/data";

export const dynamicParams = false;

export function generateStaticParams() {
  return ips.map((ip) => ({ id: ip.id }));
}

interface IpPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: IpPageProps): Promise<Metadata> {
  const { id } = await params;
  const imported = await getImportedCollaborations();
  const detail = getIpDetail(id, imported);
  return { title: detail ? `${detail.ip.name}联动记录` : "未找到 IP" };
}

export default async function IpPage({ params }: IpPageProps) {
  const { id } = await params;
  const imported = await getImportedCollaborations();
  const detail = getIpDetail(id, imported);
  if (!detail) notFound();
  return <SimpleIpDetail detail={detail} />;
}
