import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export interface ProcessedAnnouncement {
  status: "done" | "ignored";
  contentHash: string;
  collaborationId?: string;
  processedAt: string;
}

export interface GenshinSourceState {
  source: "genshin";
  processed: Record<string, ProcessedAnnouncement>;
}

const stateFile = process.env.GENSHIN_STATE_FILE || path.join(process.cwd(), "data", "genshin-source.json");

export async function loadGenshinState(): Promise<GenshinSourceState> {
  try {
    const content = await readFile(/* turbopackIgnore: true */ stateFile, "utf8");
    return JSON.parse(content) as GenshinSourceState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return {
      source: "genshin",
      processed: {
        "124755": { status: "done", contentHash: "previously-imported", collaborationId: "imported-fb95eb4febc1", processedAt: "2026-11-05T00:00:00.000Z" },
      },
    };
  }
}

export async function saveGenshinState(state: GenshinSourceState) {
  await mkdir(/* turbopackIgnore: true */ path.dirname(stateFile), { recursive: true });
  const temporary = `${stateFile}.tmp`;
  await writeFile(/* turbopackIgnore: true */ temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(/* turbopackIgnore: true */ temporary, stateFile);
}
