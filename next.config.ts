import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The site is entirely static — no server actions, no route handlers, no
  // request-time APIs. Exporting to plain HTML means it can sit on Cloudflare
  // Pages (or any static host) with no adapter and no cold starts, which also
  // keeps hosting free while the client is still deciding.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
