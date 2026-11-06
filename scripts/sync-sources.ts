import { monitoredSourceIds, syncMonitoredSources, type MonitoredSourceId } from "../src/lib/sources/run";

async function main() {
  if (process.argv.includes("--help")) {
    console.log(`用法：npm run sync:sources [-- --source=zzz]\n增量同步五个游戏官方源及 ChineseFoodWiki 饮品页面。可选：${monitoredSourceIds.join(", ")}`);
    return;
  }

  const requested = process.argv.find((argument) => argument.startsWith("--source="))?.split("=")[1];
  if (requested && !monitoredSourceIds.includes(requested as MonitoredSourceId)) {
    throw new Error(`未知来源 ${requested}，可选：${monitoredSourceIds.join(", ")}`);
  }
  const result = await syncMonitoredSources(requested as MonitoredSourceId | undefined);
  console.log(JSON.stringify({ syncedAt: new Date().toISOString(), ...result }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
