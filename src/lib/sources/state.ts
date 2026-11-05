import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SourceId } from "./types";

export interface ProcessedAnnouncement {
  status: "done" | "ignored";
  contentHash: string;
  collaborationId?: string;
  processedAt: string;
  reason?: string;
}

export interface SourceState {
  source: SourceId;
  processed: Record<string, ProcessedAnnouncement>;
}

const stateDirectory = process.env.SOURCE_STATE_DIR || path.join(process.cwd(), "data", "sources");
const legacyGenshinFile = process.env.GENSHIN_STATE_FILE || path.join(process.cwd(), "data", "genshin-source.json");
const stateFile = (source: SourceId) => path.join(stateDirectory, `${source}.json`);

export async function loadSourceState(source: SourceId): Promise<SourceState> {
  try {
    const content = await readFile(/* turbopackIgnore: true */ stateFile(source), "utf8");
    return JSON.parse(content) as SourceState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  if (source === "genshin") {
    try {
      const legacy = await readFile(/* turbopackIgnore: true */ legacyGenshinFile, "utf8");
      return JSON.parse(legacy) as SourceState;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  return {
    source,
    processed: source === "genshin" ? {
      "124755": { status: "done", contentHash: "previously-imported", collaborationId: "imported-fb95eb4febc1", processedAt: "2026-11-05T00:00:00.000Z" },
    } : {},
  };
}

export async function saveSourceState(state: SourceState) {
  const file = stateFile(state.source);
  await mkdir(/* turbopackIgnore: true */ path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  await writeFile(/* turbopackIgnore: true */ temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(/* turbopackIgnore: true */ temporary, file);
}
