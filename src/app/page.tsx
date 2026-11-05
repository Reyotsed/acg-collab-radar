import { DomesticTimeline } from "../components/domestic-timeline";
import { getImportedCollaborations } from "@/lib/imported-store";

export default async function HomePage() {
  const imported = await getImportedCollaborations();
  return <DomesticTimeline imported={imported} />;
}
