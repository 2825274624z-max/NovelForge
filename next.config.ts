import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["prisma-adapter-sqlite"],
};

export default nextConfig;
