import { syncLatestGenshinCollab } from "../lib/sources/genshin";

async function main() {
  if (process.argv.includes("--help")) {
    console.log("用法：npm run sync:genshin\n从原神官方公告增量同步餐饮联动，并更新 data/ 下的 JSON 数据。");
    return;
  }

  try {
    const report = await syncLatestGenshinCollab();
    console.log(JSON.stringify({ syncedAt: new Date().toISOString(), ...report }, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  }
}

void main();
