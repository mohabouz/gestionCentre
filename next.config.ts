import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  distDir: process.env.CENTMAN_DIST_DIR || ".next",
  outputFileTracingIncludes: {
    "/api/**": ["./dev.db"],
  },
  outputFileTracingExcludes: {
    "/*": ["./*.db-*", "./*.db.bak*", "./prisma/*.db"],
  },
};

export default nextConfig;
