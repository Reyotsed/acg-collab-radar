import { officialSources } from "../src/lib/sources/registry";
import { syncOfficialSources } from "../src/lib/sources/sync";
import type { SourceId } from "../src/lib/sources/types";

async function main() {
  if (process.argv.includes("--help")) {
    console.log("用法：npm run sync:sources [-- --source=zzz]\n增量同步原神、崩铁、崩三、绝区零和明日方舟官方公告。");
    return;
  }

  const requested = process.argv.find((argument) => argument.startsWith("--source="))?.split("=")[1];
  const sourceIds = officialSources.map((source) => source.id);
  if (requested && !sourceIds.includes(requested as SourceId)) throw new Error(`未知来源 ${requested}，可选：${sourceIds.join(", ")}`);
  const reports = await syncOfficialSources(requested ? [requested as SourceId] : undefined);
  console.log(JSON.stringify({ syncedAt: new Date().toISOString(), reports }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
