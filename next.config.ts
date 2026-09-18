import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["sharp"],
  outputFileTracingExcludes: {
    "*": ["sharp", "@img/*"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "motion", "date-fns"],
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
