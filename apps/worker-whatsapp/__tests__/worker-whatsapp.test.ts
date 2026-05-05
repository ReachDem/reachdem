import { describe, expect, it, vi } from "vitest";
import worker from "../src";

function createEnv() {
  return {
    WHATSAPP_QUEUE: { send: vi.fn().mockResolvedValue(undefined) },
    WORKER_ENV: "development",
    REACHDEM_WORKER_INTERNAL_SECRET: "secret",
    WHATSAPP_EVOLUTION_API_BASE_URL: "https://evolution.example.com",
    WHATSAPP_EVOLUTION_API_KEY: "evolution-key",
  };
}

describe("worker-whatsapp", () => {
  it("rejects wrong channel payloads", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/queue/whatsapp", {
        method: "POST",
        headers: { "x-internal-secret": "secret" },
        body: JSON.stringify({
          message_id: "msg_1",
          organization_id: "org_1",
          channel: "sms",
          delivery_cycle: 1,
        }),
      }),
      createEnv()
    );

    expect(response.status).toBe(400);
  });

  it("queues valid whatsapp jobs", async () => {
    const env = createEnv();
    const response = await worker.fetch(
      new Request("https://worker.test/queue/whatsapp", {
        method: "POST",
        headers: { "x-internal-secret": "secret" },
        body: JSON.stringify({
          message_id: "msg_1",
          organization_id: "org_1",
          channel: "whatsapp",
          delivery_cycle: 1,
        }),
      }),
      env
    );

    expect(response.status).toBe(200);
    expect(env.WHATSAPP_QUEUE.send).toHaveBeenCalledTimes(1);
  });
});
