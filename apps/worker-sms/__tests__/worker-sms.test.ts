import { describe, expect, it, vi } from "vitest";
import worker from "../src";

function createEnv() {
  return {
    SMS_QUEUE: { send: vi.fn().mockResolvedValue(undefined) },
    WORKER_ENV: "development",
    REACHDEM_WORKER_INTERNAL_SECRET: "secret",
    SMS_AVLYTEXT_API_KEY: "avly",
    SMS_MBOA_USER_ID: "mboa",
    SMS_MBOA_API_PASSWORD: "password",
  };
}

describe("worker-sms", () => {
  it("rejects invalid internal secrets", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/queue/sms", {
        method: "POST",
        headers: { "x-internal-secret": "wrong" },
        body: JSON.stringify({
          message_id: "msg_1",
          organization_id: "org_1",
          channel: "sms",
          delivery_cycle: 1,
        }),
      }),
      createEnv()
    );

    expect(response.status).toBe(401);
  });

  it("queues valid sms jobs", async () => {
    const env = createEnv();
    const response = await worker.fetch(
      new Request("https://worker.test/queue/sms", {
        method: "POST",
        headers: { "x-internal-secret": "secret" },
        body: JSON.stringify({
          message_id: "msg_1",
          organization_id: "org_1",
          channel: "sms",
          delivery_cycle: 1,
        }),
      }),
      env
    );

    expect(response.status).toBe(200);
    expect(env.SMS_QUEUE.send).toHaveBeenCalledTimes(1);
  });
});
