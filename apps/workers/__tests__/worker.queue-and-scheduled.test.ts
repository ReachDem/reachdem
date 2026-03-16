import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EmailExecutionJob, SmsExecutionJob } from "@reachdem/shared";
import type {
  Env,
  MessageBatch,
  QueueMessageEnvelope,
  ScheduledController,
} from "../src/types";

const mockedFns = vi.hoisted(() => ({
  processSmsExecuteMock: vi.fn(),
  processEmailExecuteMock: vi.fn(),
  sendMailMock: vi.fn(),
}));

vi.mock("@reachdem/core", () => ({
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
import { handleSmsBatch } from "../src/queue-sms";
import { handleEmailBatch } from "../src/queue-email";
import { handleScheduled } from "../src/scheduled";

function createEnv(): Env {
  return {
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

  it("scheduled handler claims scheduled messages and queues SMS and email jobs", async () => {
    const env = createEnv();
    const controller: ScheduledController = {
      cron: "* * * * *",
      scheduledTime: Date.parse("2026-03-14T10:00:00.000Z"),
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
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
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            updated: 2,
            ids: ["msg_scheduled_sms", "msg_scheduled_email"],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    await handleScheduled(controller, env);

    expect(fetchMock).toHaveBeenCalledTimes(2);
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
