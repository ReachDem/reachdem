import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@reachdem/database", "@reachdem/auth"],
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
