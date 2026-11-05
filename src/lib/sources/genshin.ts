import { getOfficialSource } from "./registry";
import { isCollabCandidate, syncOfficialSource } from "./sync";

export const isGenshinCollabCandidate = isCollabCandidate;

export function syncLatestGenshinCollab() {
  return syncOfficialSource(getOfficialSource("genshin"));
}
