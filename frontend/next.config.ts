import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: { root: path.resolve(import.meta.dirname, "..") },
};

export default nextConfig;
