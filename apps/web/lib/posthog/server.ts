import { PostHog } from "posthog-node";
import { getPostHogHost, getPostHogPublicToken } from "./config";

export function createPostHogServerClient(): PostHog | null {
  const token = getPostHogPublicToken();
  const host = getPostHogHost();

  if (!token || !host) {
    return null;
  }

  return new PostHog(token, {
    host,
    flushAt: 1,
    flushInterval: 0,
  });
}

export async function capturePostHogServerEvent(input: {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}) {
  const client = createPostHogServerClient();

  if (!client) {
    return;
  }

  try {
    client.capture(input);
  } finally {
    await client.shutdown();
  }
}
