import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "motion", "date-fns"],
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
