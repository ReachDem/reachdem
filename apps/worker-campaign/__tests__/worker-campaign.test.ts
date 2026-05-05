import { describe, expect, it, vi } from "vitest";
import worker from "../src";

function createEnv() {
  return {
    CAMPAIGN_LAUNCH_QUEUE: { send: vi.fn().mockResolvedValue(undefined) },
    SMS_QUEUE: { send: vi.fn().mockResolvedValue(undefined) },
    EMAIL_QUEUE: { send: vi.fn().mockResolvedValue(undefined) },
    WHATSAPP_QUEUE: { send: vi.fn().mockResolvedValue(undefined) },
    WORKER_ENV: "development",
    REACHDEM_WORKER_INTERNAL_SECRET: "secret",
  };
}

describe("worker-campaign", () => {
  it("queues valid campaign launch jobs", async () => {
    const env = createEnv();
    const response = await worker.fetch(
      new Request("https://worker.test/queue/campaign-launch", {
        method: "POST",
        headers: { "x-internal-secret": "secret" },
        body: JSON.stringify({
          campaign_id: "campaign_1",
          organization_id: "org_1",
        }),
      }),
      env
    );

    expect(response.status).toBe(200);
    expect(env.CAMPAIGN_LAUNCH_QUEUE.send).toHaveBeenCalledTimes(1);
  });
});
