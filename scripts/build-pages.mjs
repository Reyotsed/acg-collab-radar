import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const staging = path.join(root, `.pages-local-only-${process.pid}`);
const localOnlyPaths = ["app/api", "app/ingest"];
const moved = [];

try {
  mkdirSync(staging);
  for (const relativePath of localOnlyPaths) {
    const source = path.join(root, relativePath);
    if (!existsSync(source)) continue;
    const destination = path.join(staging, path.basename(relativePath));
    renameSync(source, destination);
    moved.push({ source, destination });
  }

  const nextBinary = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "next.cmd" : "next");
  const result = spawnSync(nextBinary, ["build"], {
    cwd: root,
    env: {
      ...process.env,
      GITHUB_PAGES: "true",
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_DIST_DIR: process.env.NEXT_DIST_DIR || "out",
    },
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  for (const { source, destination } of moved.reverse()) {
    if (existsSync(destination)) renameSync(destination, source);
  }
  if (existsSync(staging)) rmdirSync(staging);
}
