import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site for GitHub Pages: no server at runtime.
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  images: { unoptimized: true },
};

export default nextConfig;
