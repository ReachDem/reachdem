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
    SCHEDULER_API_BASE_URL: "https://app.example.com",
  };
}

describe("worker-scheduler", () => {
  it("protects queue status", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/queue/status"),
      createEnv()
    );

    expect(response.status).toBe(401);
  });

  it("allows health checks without internal auth", async () => {
    const response = await worker.fetch(
      new Request("https://worker.test/health"),
      createEnv()
    );

    expect(response.status).toBe(200);
  });
});
