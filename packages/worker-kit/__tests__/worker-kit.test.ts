import { describe, expect, it, vi } from "vitest";
import {
  WorkerConfigurationError,
  assertInternalRequest,
  parseJsonWithSchema,
  processQueueBatch,
  requireUrlEnv,
} from "../src";
import { smsExecutionJobSchema } from "@reachdem/jobs";

describe("@reachdem/worker-kit", () => {
  it("throws explicit errors for missing env vars", () => {
    expect(() =>
      requireUrlEnv({}, "SCHEDULER_API_BASE_URL", "scheduler")
    ).toThrow(WorkerConfigurationError);
  });

  it("authenticates internal requests with the shared header", () => {
    const request = new Request("https://worker.test/queue", {
      headers: { "x-internal-secret": "secret" },
    });

    expect(() =>
      assertInternalRequest(
        request,
        {
          REACHDEM_WORKER_INTERNAL_SECRET: "secret",
        },
        "sms"
      )
    ).not.toThrow();
  });

  it("rejects invalid job payloads", async () => {
    const request = new Request("https://worker.test/queue", {
      method: "POST",
      body: JSON.stringify({
        message_id: "msg_1",
        organization_id: "org_1",
        channel: "email",
        delivery_cycle: 1,
      }),
    });

    await expect(
      parseJsonWithSchema(request, smsExecutionJobSchema)
    ).rejects.toThrow();
  });

  it("acks successful queue messages and retries failures", async () => {
    const ack = vi.fn();
    const retry = vi.fn();
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    await processQueueBatch({
      batch: {
        queue: "queue",
        messages: [{ body: "ok", ack, retry }],
      },
      logger,
      handler: async () => "done",
    });

    expect(ack).toHaveBeenCalledTimes(1);
    expect(retry).not.toHaveBeenCalled();
  });
});
