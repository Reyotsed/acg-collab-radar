import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function isPrivateAddress(address: string) {
  if (address.includes(":")) {
    const ip = address.toLowerCase();
    return ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe8") || ip.startsWith("fe9") || ip.startsWith("fea") || ip.startsWith("feb");
  }
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 192 && b === 0)
    || (a === 198 && (b === 51 || b === 18))
    || (a === 203 && b === 0);
}

export async function assertPublicUrl(value: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("只支持 HTTP/HTTPS 公告链接");
  const hostname = url.hostname.toLowerCase();
  if (["localhost", "localhost.localdomain", "metadata.google.internal"].includes(hostname) || hostname.endsWith(".local")) {
    throw new Error("不允许访问本机或内部网络地址");
  }
  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error("不允许访问私有 IP 地址");
    return url;
  }
  const addresses = await lookup(hostname, { all: true });
  if (addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("公告域名解析到了内部网络地址");
  return url;
}

export async function fetchPublic(input: string, init: RequestInit = {}, timeoutMs = 30_000): Promise<Response> {
  let current = input;
  for (let redirect = 0; redirect < 5; redirect += 1) {
    const url = await assertPublicUrl(current);
    const response = await fetch(url, {
      ...init,
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "User-Agent": "CollabRadar/0.1 (+https://github.com)",
        ...init.headers,
      },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) return response;
      current = new URL(location, url).toString();
      continue;
    }
    return response;
  }
  throw new Error("公告链接重定向次数过多");
}
