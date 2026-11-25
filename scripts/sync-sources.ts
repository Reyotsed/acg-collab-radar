import { appendFileSync } from "node:fs";
import { monitoredSourceIds, syncMonitoredSources, type MonitoredSourceId } from "../src/lib/sources/run";

async function main() {
  if (process.argv.includes("--help")) {
    console.log(`用法：npm run sync:sources [-- --source=zzz]\n增量同步游戏官方源、ChineseFoodWiki 和每日 Firecrawl Search。可选：${monitoredSourceIds.join(", ")}\nWiki 初始化（全部行、全部 Sources）：npm run sync:sources -- --source=chinesefoodwiki --manual\n限量补跑可追加：--limit=14 --source-limit=2\n立即执行一次搜索：npm run sync:sources -- --source=web-discovery`);
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
  const healthy = result.reports.every((report) => !report.error)
    && (!result.chineseFoodWiki || result.chineseFoodWiki.errors.length === 0)
    && (!result.webDiscovery || result.webDiscovery.errors.length === 0);
  console.log(JSON.stringify({ syncedAt: new Date().toISOString(), healthy, ...result }, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) {
    const cell = (value: string) => value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
    const failures = [
      ...result.reports.filter((report) => report.error).map((report) => `| ${report.source} | ${cell(report.error ?? "未知同步错误")} |`),
      ...(result.chineseFoodWiki?.errors ?? []).map((item) => `| chinesefoodwiki | ${cell(`${item.title}：${item.error}`)} |`),
      ...(result.webDiscovery?.errors ?? []).map((item) => `| web-discovery | ${cell(item.title ?? item.query ?? "Search")}：${cell(item.error)} |`),
    ];
    const summary = [
      "## 同步健康检查",
      "",
      ...(failures.length ? ["| 来源 | 错误 |", "|---|---|", ...failures] : ["已启用信息源均未报告同步错误。"]),
      ...(result.webDiscovery?.status === "disabled" ? ["", "> Firecrawl Search 未启用：请在仓库 Actions secrets 中配置 FIRECRAWL_API_KEY。"] : []),
      ...(result.webDiscovery && result.webDiscovery.status !== "disabled" ? ["", `Search 状态：${result.webDiscovery.status}；本轮预估 ${result.webDiscovery.estimatedCredits.total} 额度，累计预估 ${result.webDiscovery.totalEstimatedCredits} 额度。`] : []),
      "",
    ];
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.join("\n"), "utf8");
  }
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `healthy=${healthy}\n`, "utf8");
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
