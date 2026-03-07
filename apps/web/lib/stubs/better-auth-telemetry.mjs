// Stub for @better-auth/telemetry — avoids the broken @better-auth/core/env import in pnpm monorepos.
// This is a no-op: all exports are empty functions so telemetry simply does nothing.
export function createTelemetry() {
  return {
    track: () => {},
    identify: () => {},
    flush: async () => {},
  };
}
export const telemetry = createTelemetry();
export const getTelemetryAuthConfig = () => undefined;
