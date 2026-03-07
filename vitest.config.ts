import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 20000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
    alias: {
      "@": resolve(__dirname, "./apps/web"),
      "@reachdem/database": resolve(__dirname, "./packages/database/src"),
      "@reachdem/auth": resolve(__dirname, "./packages/auth/src"),
    },
  },
});
