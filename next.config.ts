import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export', // Tells Next.js to generate static HTML/CSS/JS
  images: {
    unoptimized: true, // GitHub Pages doesn't support Next.js default image optimization
  },
};

export default nextConfig;
