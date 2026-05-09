import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["prisma-adapter-sqlite", "@prisma/client", "prisma"],
  outputFileTracingIncludes: {
    "/api/ai": ["./node_modules/.prisma/client/**"],
    "/api/projects": ["./node_modules/.prisma/client/**"],
  },
};

export default nextConfig;
