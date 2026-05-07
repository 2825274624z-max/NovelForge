import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["prisma-adapter-sqlite"],
};

export default nextConfig;
