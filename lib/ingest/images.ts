import sharp from "sharp";
import { fetchPublic } from "./http";
import type { PreparedImages } from "./types";

const MAX_IMAGES = 6;
const MAX_TILES = 12;
const TILE_HEIGHT = 4000;
const MAX_IMAGE_BYTES = 32 * 1024 * 1024;
const MAX_INLINE_BYTES = 44 * 1024 * 1024;

async function downloadImage(url: string) {
  const response = await fetchPublic(url, {}, 60_000);
  if (!response.ok) throw new Error(`图片返回 ${response.status}`);
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_IMAGE_BYTES) throw new Error("图片超过 32 MiB 限制");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_IMAGE_BYTES) throw new Error("图片超过 32 MiB 限制");
  return buffer;
}

export async function prepareModelImages(urls: string[]): Promise<PreparedImages> {
  const content: unknown[] = [];
  const warnings: string[] = [];
  let tileCount = 0;
  let totalBytes = 0;

  for (const url of urls.slice(0, MAX_IMAGES)) {
    if (tileCount >= MAX_TILES || totalBytes >= MAX_INLINE_BYTES) break;
    try {
      const input = await downloadImage(url);
      let pipeline = sharp(input, { failOn: "error" }).rotate();
      const metadata = await pipeline.metadata();
      if (!metadata.width || !metadata.height) throw new Error("无法读取图片尺寸");
      if (metadata.width > 4096) pipeline = pipeline.resize({ width: 4096 });
      const normalized = await pipeline.toBuffer();
      const normalizedMetadata = await sharp(normalized).metadata();
      const width = normalizedMetadata.width ?? metadata.width;
      const height = normalizedMetadata.height ?? metadata.height;

      for (let top = 0; top < height && tileCount < MAX_TILES; top += TILE_HEIGHT) {
        const tileHeight = Math.min(TILE_HEIGHT, height - top);
        const tile = await sharp(normalized)
          .extract({ left: 0, top, width, height: tileHeight })
          .flatten({ background: "#ffffff" })
          .jpeg({ quality: 86 })
          .toBuffer();
        if (totalBytes + tile.byteLength > MAX_INLINE_BYTES) {
          warnings.push("图片总大小超过单次请求限制，部分图片未发送");
          break;
        }
        totalBytes += tile.byteLength;
        tileCount += 1;
        content.push({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${tile.toString("base64")}`, detail: "original" },
        });
      }
    } catch (error) {
      warnings.push(`图片处理失败：${new URL(url).hostname}（${error instanceof Error ? error.message : "未知错误"}）`);
    }
  }

  if (urls.length > MAX_IMAGES) warnings.push(`仅处理前 ${MAX_IMAGES} 张公告图片，其余图片保留原链接供核查`);
  if (tileCount === 0) throw new Error("没有可提交给多模态模型的公告图片");
  return { content, tileCount, totalBytes, warnings };
}
