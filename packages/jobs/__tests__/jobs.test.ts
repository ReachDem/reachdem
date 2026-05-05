import { describe, expect, it } from "vitest";
import {
  createMessageExecutionJob,
  getQueueName,
  queueRegistry,
  smsExecutionJobSchema,
} from "../src";

describe("@reachdem/jobs", () => {
  it("uses environment-specific queue names", () => {
    expect(getQueueName("development", "sms")).toBe("reachdem-sms-queue");
    expect(getQueueName("staging", "sms")).toBe("reachdem-sms-queue-staging");
    expect(getQueueName("production", "sms")).toBe(
      "reachdem-sms-queue-v2-production"
    );
  });

  it("validates channel-specific payloads", () => {
    expect(() =>
      smsExecutionJobSchema.parse({
        message_id: "msg_1",
        organization_id: "org_1",
        channel: "email",
        delivery_cycle: 1,
      })
    ).toThrow();
  });

  it("creates first-cycle message jobs by default", () => {
    expect(
      createMessageExecutionJob({
        message_id: "msg_1",
        organization_id: "org_1",
        channel: "sms",
      })
    ).toMatchObject({ delivery_cycle: 1 });
  });

  it("keeps all non-scheduler domains configured in every environment", () => {
    expect(Object.keys(queueRegistry.development).sort()).toEqual([
      "campaign",
      "email",
      "sms",
      "whatsapp",
    ]);
    expect(Object.keys(queueRegistry.staging).sort()).toEqual([
      "campaign",
      "email",
      "sms",
      "whatsapp",
    ]);
    expect(Object.keys(queueRegistry.production).sort()).toEqual([
      "campaign",
      "email",
      "sms",
      "whatsapp",
    ]);
  });
});
