import { monitoredSourceIds, syncMonitoredSources, type MonitoredSourceId } from "../src/lib/sources/run";

async function main() {
  if (process.argv.includes("--help")) {
    console.log(`用法：npm run sync:sources [-- --source=zzz]\n增量同步五个游戏官方源及 ChineseFoodWiki 饮品页面。可选：${monitoredSourceIds.join(", ")}\nWiki 初始化（全部行、全部 Sources）：npm run sync:sources -- --source=chinesefoodwiki --manual\n限量补跑可追加：--limit=14 --source-limit=2`);
    return;
  }

  const requested = process.argv.find((argument) => argument.startsWith("--source="))?.split("=")[1];
  if (requested && !monitoredSourceIds.includes(requested as MonitoredSourceId)) {
    throw new Error(`未知来源 ${requested}，可选：${monitoredSourceIds.join(", ")}`);
  }
  const wikiManual = process.argv.includes("--manual");
  if (wikiManual && requested !== "chinesefoodwiki") throw new Error("--manual 仅支持与 --source=chinesefoodwiki 一起使用");
  const limitArgument = process.argv.find((argument) => argument.startsWith("--limit="))?.split("=")[1];
  const wikiLimit = limitArgument === "all" ? "all" : limitArgument ? Number(limitArgument) : undefined;
  if (typeof wikiLimit === "number" && (!Number.isInteger(wikiLimit) || wikiLimit < 1 || wikiLimit > 100)) {
    throw new Error("--limit 必须是 all 或 1 到 100 的整数");
  }
  const sourceLimitArgument = process.argv.find((argument) => argument.startsWith("--source-limit="))?.split("=")[1];
  const wikiSourceLimit = sourceLimitArgument === "all" ? "all" : sourceLimitArgument ? Number(sourceLimitArgument) : undefined;
  if (typeof wikiSourceLimit === "number" && (!Number.isInteger(wikiSourceLimit) || wikiSourceLimit < 1 || wikiSourceLimit > 10)) {
    throw new Error("--source-limit 必须是 all 或 1 到 10 的整数");
  }
  const result = await syncMonitoredSources(requested as MonitoredSourceId | undefined, { wikiManual, wikiLimit, wikiSourceLimit });
  console.log(JSON.stringify({ syncedAt: new Date().toISOString(), ...result }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
