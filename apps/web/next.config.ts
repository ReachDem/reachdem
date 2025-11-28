import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@reachdem/database"],
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
