import { describe, expect, it, vi } from "vitest";
import worker from "../src";

function createEnv() {
  return {
    EMAIL_QUEUE: { send: vi.fn().mockResolvedValue(undefined) },
    WORKER_ENV: "development",
    REACHDEM_WORKER_INTERNAL_SECRET: "secret",
    EMAIL_ALIBABA_ACCESS_KEY_ID: "key",
    EMAIL_ALIBABA_ACCESS_KEY_SECRET: "secret-key",
    EMAIL_SENDER_ADDRESS: "sender@example.com",
    EMAIL_SENDER_NAME: "ReachDem",
  };
}

describe("worker-email", () => {
  it("rejects enqueue requests without internal secret", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/queue/email", {
        method: "POST",
        body: JSON.stringify({
          message_id: "msg_1",
          organization_id: "org_1",
          channel: "email",
          delivery_cycle: 1,
        }),
      }),
      createEnv()
    );

    expect(response.status).toBe(401);
  });

  it("queues valid email jobs", async () => {
    const env = createEnv();
    const response = await worker.fetch(
      new Request("https://worker.test/queue/email", {
        method: "POST",
        headers: { "x-internal-secret": "secret" },
        body: JSON.stringify({
          message_id: "msg_1",
          organization_id: "org_1",
          channel: "email",
          delivery_cycle: 1,
        }),
      }),
      env
    );

    expect(response.status).toBe(200);
    expect(env.EMAIL_QUEUE.send).toHaveBeenCalledTimes(1);
  });
});
