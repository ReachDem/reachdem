import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkerJobClient } from "../worker-job-client";

describe("WorkerJobClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("publishes to the configured domain URL with the internal secret", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("REACHDEM_WORKER_SMS_URL", "https://sms.worker.dev");
    vi.stubEnv("REACHDEM_WORKER_INTERNAL_SECRET", "secret");

    await WorkerJobClient.publish("sms", {
      message_id: "msg_1",
      organization_id: "org_1",
      channel: "sms",
      delivery_cycle: 1,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://sms.worker.dev/queue/sms"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-internal-secret": "secret",
        }),
      })
    );
  });

  it("fails fast when a worker URL is missing", async () => {
    vi.stubEnv("REACHDEM_WORKER_INTERNAL_SECRET", "secret");

    await expect(
      WorkerJobClient.publish("email", {
        message_id: "msg_1",
        organization_id: "org_1",
        channel: "email",
        delivery_cycle: 1,
      })
    ).rejects.toThrow("REACHDEM_WORKER_EMAIL_URL");
  });
});
