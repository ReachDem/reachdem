import type { NextConfig } from "next";
import path from "path";

const TELEMETRY_STUB_WEBPACK = path.resolve(
  __dirname,
  "lib/stubs/better-auth-telemetry.mjs"
);

const nextConfig: NextConfig = {
  transpilePackages: ["@reachdem/database", "@reachdem/auth"],
  serverExternalPackages: ["@prisma/client"],
  // Turbopack alias (used by `next dev` in Next.js 16)
  turbopack: {
    resolveAlias: {
      "@better-auth/telemetry": "./lib/stubs/better-auth-telemetry.mjs",
    },
  },
  // Webpack alias (used by `next build`)
  webpack(config) {
    config.resolve.alias["@better-auth/telemetry"] = TELEMETRY_STUB_WEBPACK;
    return config;
  },
};

export default nextConfig;
