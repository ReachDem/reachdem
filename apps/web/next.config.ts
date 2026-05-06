import type { NextConfig } from "next";
import path from "path";

const TELEMETRY_STUB_WEBPACK = path.resolve(
  __dirname,
  "lib/stubs/better-auth-telemetry.mjs"
);
const AUTH_PACKAGE_TURBOPACK = "../../packages/auth/src/index.ts";
const AUTH_CLIENT_PACKAGE_TURBOPACK = "../../packages/auth/src/auth-client.ts";
const CORE_PACKAGE_TURBOPACK = "../../packages/core/src/index.ts";
const DATABASE_PACKAGE_TURBOPACK = "../../packages/database/src/index.ts";
const EMAIL_UI_PACKAGE_TURBOPACK = "../../packages/email-ui/src/index.ts";
const SHARED_PACKAGE_TURBOPACK = "../../packages/shared/src/index.ts";
const TRANSACTIONAL_PACKAGE_TURBOPACK = "../../packages/transactional/index.ts";
const AUTH_PACKAGE = path.resolve(
  __dirname,
  "../../packages/auth/src/index.ts"
);
const AUTH_CLIENT_PACKAGE = path.resolve(
  __dirname,
  "../../packages/auth/src/auth-client.ts"
);
const CORE_PACKAGE = path.resolve(
  __dirname,
  "../../packages/core/src/index.ts"
);
const DATABASE_PACKAGE = path.resolve(
  __dirname,
  "../../packages/database/src/index.ts"
);
const EMAIL_UI_PACKAGE = path.resolve(
  __dirname,
  "../../packages/email-ui/src/index.ts"
);
const SHARED_PACKAGE = path.resolve(
  __dirname,
  "../../packages/shared/src/index.ts"
);
const TRANSACTIONAL_PACKAGE = path.resolve(
  __dirname,
  "../../packages/transactional/index.ts"
);

const nextConfig: NextConfig = {
  allowedDevOrigins: ["flavourfully-unigniting-jamel.ngrok-free.dev"],
  transpilePackages: [
    "@reachdem/auth",
    "@reachdem/core",
    "@reachdem/database",
    "@reachdem/email-ui",
    "@reachdem/shared",
    "@reachdem/transactional",
  ],
  serverExternalPackages: [
    "@prisma/client",
    "better-auth/adapters/prisma",
    "@better-auth/core",
  ],
  typescript: {
    // lucide-react@0.454 types are incompatible with @types/react@19
    ignoreBuildErrors: true,
  },
  // Turbopack alias (used by `next dev` in Next.js 16)
  turbopack: {
    resolveAlias: {
      "@reachdem/auth": AUTH_PACKAGE_TURBOPACK,
      "@reachdem/auth/client": AUTH_CLIENT_PACKAGE_TURBOPACK,
      "@reachdem/core": CORE_PACKAGE_TURBOPACK,
      "@reachdem/database": DATABASE_PACKAGE_TURBOPACK,
      "@reachdem/email-ui": EMAIL_UI_PACKAGE_TURBOPACK,
      "@reachdem/shared": SHARED_PACKAGE_TURBOPACK,
      "@reachdem/transactional": TRANSACTIONAL_PACKAGE_TURBOPACK,
      "@better-auth/telemetry": "./lib/stubs/better-auth-telemetry.mjs",
      "@prisma/client/default": "@prisma/client/default.js",
    },
  },
  // Webpack alias (used by `next build`)
  webpack(config) {
    config.resolve.alias["@reachdem/auth"] = AUTH_PACKAGE;
    config.resolve.alias["@reachdem/auth/client"] = AUTH_CLIENT_PACKAGE;
    config.resolve.alias["@reachdem/core"] = CORE_PACKAGE;
    config.resolve.alias["@reachdem/database"] = DATABASE_PACKAGE;
    config.resolve.alias["@reachdem/email-ui"] = EMAIL_UI_PACKAGE;
    config.resolve.alias["@reachdem/shared"] = SHARED_PACKAGE;
    config.resolve.alias["@reachdem/transactional"] = TRANSACTIONAL_PACKAGE;
    config.resolve.alias["@better-auth/telemetry"] = TELEMETRY_STUB_WEBPACK;
    return config;
  },
};

export default nextConfig;
