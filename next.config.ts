import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const pagesBasePath = process.env.PAGES_BASE_PATH ?? "/acg-collab-radar";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: isGitHubPages ? "export" : "standalone",
  distDir: process.env.NEXT_DIST_DIR || ".next",
  basePath: isGitHubPages ? pagesBasePath : "",
  trailingSlash: isGitHubPages,
  images: { unoptimized: isGitHubPages },
};

export default nextConfig;
