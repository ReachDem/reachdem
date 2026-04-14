import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EmailExecutionJob, SmsExecutionJob } from "@reachdem/shared";
import type {
  Env,
  MessageBatch,
  QueueMessageEnvelope,
  ScheduledController,
} from "../src/types";

const mockedFns = vi.hoisted(() => ({
  processCampaignLaunchExecuteMock: vi.fn(),
  processSmsExecuteMock: vi.fn(),
  processEmailExecuteMock: vi.fn(),
  sendMailMock: vi.fn(),
}));

vi.mock("@reachdem/core", () => ({
  ProcessCampaignLaunchJobUseCase: {
    execute: mockedFns.processCampaignLaunchExecuteMock,
  },
  ProcessSmsMessageJobUseCase: {
    execute: mockedFns.processSmsExecuteMock,
  },
  ProcessEmailMessageJobUseCase: {
    execute: mockedFns.processEmailExecuteMock,
  },
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockedFns.sendMailMock,
    })),
    getTestMessageUrl: vi.fn(() => null),
  },
}));

import worker from "../src/index";
import { handleCampaignLaunchBatch } from "../src/campaign-launch";
import { handleSmsBatch } from "../src/queue-sms";
import { handleEmailBatch } from "../src/queue-email";
import { handleScheduled } from "../src/scheduled";

function createEnv(): Env {
  return {
    CAMPAIGN_LAUNCH_QUEUE: {
      send: vi.fn().mockResolvedValue(undefined),
    },
    SMS_QUEUE: {
      send: vi.fn().mockResolvedValue(undefined),
    },
    EMAIL_QUEUE: {
      send: vi.fn().mockResolvedValue(undefined),
    },
    ENVIRONMENT: "test",
    API_BASE_URL: "http://localhost:3000",
    INTERNAL_API_SECRET: "secret",
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "465",
    SMTP_USER: "user@example.com",
    SMTP_PASSWORD: "password",
    SMTP_SECURE: "true",
    SENDER_EMAIL: "sender@example.com",
    SENDER_NAME: "ReachDem Notifications",
  };
}

function createEnvelope<T>(body: T): QueueMessageEnvelope<T> & {
  ack: ReturnType<typeof vi.fn>;
  retry: ReturnType<typeof vi.fn>;
} {
  return {
    body,
    ack: vi.fn(),
    retry: vi.fn(),
  };
}

describe("Worker queue and scheduled flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFns.sendMailMock.mockResolvedValue({
      messageId: "smtp-message-id",
      accepted: ["dest@example.com"],
      rejected: [],
    });
  });

  it("queues an SMS job through the worker fetch endpoint", async () => {
    const env = createEnv();
    const job: SmsExecutionJob = {
      message_id: "msg_sms_1",
      organization_id: "org_1",
      channel: "sms",
      delivery_cycle: 1,
    };

    const response = await worker.fetch(
      new Request("http://localhost/queue/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job),
      }),
      env,
      { waitUntil: vi.fn() }
    );

    expect(response.status).toBe(200);
    expect(env.SMS_QUEUE.send).toHaveBeenCalledWith(job);
  });

  it("queues a campaign launch job through the worker fetch endpoint", async () => {
    const env = createEnv();
    const job = {
      campaign_id: "campaign_1",
      organization_id: "org_1",
    };

    const response = await worker.fetch(
      new Request("http://localhost/queue/campaign-launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job),
      }),
      env,
      { waitUntil: vi.fn() }
    );

    expect(response.status).toBe(200);
    expect(env.CAMPAIGN_LAUNCH_QUEUE.send).toHaveBeenCalledWith(job);
  });

  it("processes a campaign launch job and acknowledges it", async () => {
    const env = createEnv();
    const job = {
      campaign_id: "campaign_2",
      organization_id: "org_1",
    };
    const envelope = createEnvelope(job);
    const batch: MessageBatch<typeof job> = {
      queue: "reachdem-campaign-launch-queue",
      messages: [envelope],
    };

    mockedFns.processCampaignLaunchExecuteMock.mockResolvedValueOnce(
      "processed"
    );

    await handleCampaignLaunchBatch(batch, env);

    expect(mockedFns.processCampaignLaunchExecuteMock).toHaveBeenCalledTimes(1);
    expect(envelope.ack).toHaveBeenCalledTimes(1);
    expect(envelope.retry).not.toHaveBeenCalled();
  });

  it("processes an SMS queue message and acknowledges it", async () => {
    const env = createEnv();
    const job: SmsExecutionJob = {
      message_id: "msg_sms_2",
      organization_id: "org_1",
      channel: "sms",
      delivery_cycle: 1,
    };
    const envelope = createEnvelope(job);
    const batch: MessageBatch<SmsExecutionJob> = {
      queue: "reachdem-sms-queue",
      messages: [envelope],
    };

    mockedFns.processSmsExecuteMock.mockResolvedValueOnce("sent");

    await handleSmsBatch(batch, env);

    expect(mockedFns.processSmsExecuteMock).toHaveBeenCalledTimes(1);
    expect(mockedFns.processSmsExecuteMock).toHaveBeenCalledWith(
      job,
      expect.objectContaining({
        republish: expect.any(Function),
      })
    );
    expect(envelope.ack).toHaveBeenCalledTimes(1);
    expect(envelope.retry).not.toHaveBeenCalled();
  });

  it("retries an SMS queue message on technical failure", async () => {
    const env = createEnv();
    const job: SmsExecutionJob = {
      message_id: "msg_sms_retry",
      organization_id: "org_1",
      channel: "sms",
      delivery_cycle: 1,
    };
    const envelope = createEnvelope(job);
    const batch: MessageBatch<SmsExecutionJob> = {
      queue: "reachdem-sms-queue",
      messages: [envelope],
    };

    mockedFns.processSmsExecuteMock.mockRejectedValueOnce(
      new Error("database unavailable")
    );

    await handleSmsBatch(batch, env);

    expect(envelope.ack).not.toHaveBeenCalled();
    expect(envelope.retry).toHaveBeenCalledTimes(1);
  });

  it("processes an email queue message and acknowledges it", async () => {
    const env = createEnv();
    const job: EmailExecutionJob = {
      message_id: "msg_email_1",
      organization_id: "org_1",
      channel: "email",
      delivery_cycle: 1,
    };
    const envelope = createEnvelope(job);
    const batch: MessageBatch<EmailExecutionJob> = {
      queue: "reachdem-email-queue",
      messages: [envelope],
    };

    mockedFns.processEmailExecuteMock.mockResolvedValueOnce("sent");

    await handleEmailBatch(batch, env);

    expect(mockedFns.processEmailExecuteMock).toHaveBeenCalledTimes(1);
    expect(mockedFns.processEmailExecuteMock).toHaveBeenCalledWith(
      job,
      expect.objectContaining({
        republish: expect.any(Function),
        sendEmail: expect.any(Function),
      })
    );
    expect(envelope.ack).toHaveBeenCalledTimes(1);
    expect(envelope.retry).not.toHaveBeenCalled();
  });

  it("retries an email queue message on technical failure", async () => {
    const env = createEnv();
    const job: EmailExecutionJob = {
      message_id: "msg_email_retry",
      organization_id: "org_1",
      channel: "email",
      delivery_cycle: 1,
    };
    const envelope = createEnvelope(job);
    const batch: MessageBatch<EmailExecutionJob> = {
      queue: "reachdem-email-queue",
      messages: [envelope],
    };

    mockedFns.processEmailExecuteMock.mockRejectedValueOnce(
      new Error("smtp init failed")
    );

    await handleEmailBatch(batch, env);

    expect(envelope.ack).not.toHaveBeenCalled();
    expect(envelope.retry).toHaveBeenCalledTimes(1);
  });

  it("scheduled handler claims scheduled messages and queues SMS and email jobs", async () => {
    const env = createEnv();
    const controller: ScheduledController = {
      cron: "* * * * *",
      scheduledTime: Date.parse("2026-03-14T10:00:00.000Z"),
    };

    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          updated: 2,
          items: [
            {
              id: "msg_scheduled_sms",
              organizationId: "org_1",
              channel: "sms",
            },
            {
              id: "msg_scheduled_email",
              organizationId: "org_1",
              channel: "email",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    vi.stubGlobal("fetch", fetchMock);

    await handleScheduled(controller, env);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(env.SMS_QUEUE.send).toHaveBeenCalledWith({
      message_id: "msg_scheduled_sms",
      organization_id: "org_1",
      channel: "sms",
      delivery_cycle: 1,
    });
    expect(env.EMAIL_QUEUE.send).toHaveBeenCalledWith({
      message_id: "msg_scheduled_email",
      organization_id: "org_1",
      channel: "email",
      delivery_cycle: 1,
    });
  });
});
