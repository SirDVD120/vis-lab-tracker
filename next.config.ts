import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["date-fns"],
  },
};

export default nextConfig;
