import type { NextConfig } from "next";
import path from "path";

const DATABASE_PACKAGE_TURBOPACK = "../../packages/database/src/index.ts";
const DATABASE_PACKAGE = path.resolve(
  __dirname,
  "../../packages/database/src/index.ts"
);

const nextConfig: NextConfig = {
  transpilePackages: ["@reachdem/database"],
  serverExternalPackages: ["@prisma/client"],
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/overview",
        permanent: false,
      },
    ];
  },
  turbopack: {
    resolveAlias: {
      "@reachdem/database": DATABASE_PACKAGE_TURBOPACK,
      "@prisma/client/default": "@prisma/client/default.js",
    },
  },
  webpack(config) {
    config.resolve.alias["@reachdem/database"] = DATABASE_PACKAGE;
    return config;
  },
};

export default nextConfig;
