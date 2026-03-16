import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@reachdem/database";
import { auth } from "@reachdem/auth";
import { getCameroonProviderRoute, isOrange } from "@reachdem/core";
import { POST as sendSmsHandler } from "../app/api/v1/sms/send/route";
import { GET as getScheduledHandler } from "../app/api/internal/messages/scheduled/route";
import { PATCH as updateMessageStatusHandler } from "../app/api/internal/messages/status/route";
import { handleScheduled } from "../../workers/src/scheduled";
import { handleSmsBatch } from "../../workers/src/queue-sms";
import {
  getScheduledExecutionConfig,
  waitForScheduledExecution,
} from "./utils/scheduled-test";
import type {
  Env,
  MessageBatch,
  QueueMessageEnvelope,
  ScheduledController,
  SmsMessage,
} from "../../workers/src/types";

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Map()),
}));

const authMock = vi.hoisted(() => ({
  api: { getSession: vi.fn() },
}));

vi.mock("@reachdem/auth/auth", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return { ...actual, auth: authMock };
});

const REAL_ORG_ID = process.env.TEST_ORG_ID;
const TEST_USER_ID = process.env.TEST_USER_ID;
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_SCHEDULED_SMS_PHONE =
  process.env.TEST_SCHEDULED_SMS_PHONE ??
  process.env.TEST_QUEUE_SMS_PHONE ??
  process.env.TEST_AVLYTEXT_SMS_PHONE ??
  process.env.TEST_MBOA_SMS_PHONE ??
  process.env.TEST_ORANGE_PHONE_1 ??
  process.env.TEST_MTN_PHONE_1;
const TEST_AVLYTEXT_SMS_SENDER =
  process.env.TEST_AVLYTEXT_SMS_SENDER ?? "ReachDem Orange";
const LMT_SENDER_ID = process.env.LMT_SENDER_ID ?? "ReachDem";
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET ?? "test-secret";

if (!REAL_ORG_ID || !TEST_USER_ID || !TEST_USER_EMAIL) {
  throw new Error(
    "Missing required test env vars: TEST_ORG_ID, TEST_USER_ID, TEST_USER_EMAIL"
  );
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

function createWorkerEnv(smsJobs: SmsMessage[]): Env {
  return {
    SMS_QUEUE: {
      send: vi.fn(async (job: SmsMessage) => {
        smsJobs.push(job);
      }),
    },
    EMAIL_QUEUE: {
      send: vi.fn().mockResolvedValue(undefined),
    },
    ENVIRONMENT: "test",
    API_BASE_URL: "http://localhost:3000",
    INTERNAL_API_SECRET,
    SMTP_HOST: process.env.SMTP_HOST ?? "",
    SMTP_PORT: process.env.SMTP_PORT ?? "465",
    SMTP_USER: process.env.SMTP_USER ?? "",
    SMTP_PASSWORD: process.env.SMTP_PASSWORD ?? "",
    SMTP_SECURE: process.env.SMTP_SECURE ?? "true",
    SENDER_EMAIL:
      process.env.SENDER_EMAIL ??
      process.env.ALIBABA_SENDER_EMAIL ??
      process.env.SMTP_USER ??
      "",
    SENDER_NAME:
      process.env.SENDER_NAME ??
      process.env.ALIBABA_SENDER_NAME ??
      "ReachDem Notifications",
  };
}

function getExpectedSmsSender(phone: string): string {
  const baseSender = isOrange(phone) ? TEST_AVLYTEXT_SMS_SENDER : LMT_SENDER_ID;

  return (
    getCameroonProviderRoute({
      to: phone,
      text: "probe",
      from: baseSender,
    })?.[0]?.payload.from ?? baseSender
  );
}

describe("Messaging scheduled - real worker integration", () => {
  const createdMessageIds: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: TEST_USER_ID, email: TEST_USER_EMAIL } as any,
      session: { activeOrganizationId: REAL_ORG_ID } as any,
    });
  });

  afterAll(async () => {
    if (createdMessageIds.length > 0) {
      await prisma.messageAttempt.deleteMany({
        where: { messageId: { in: createdMessageIds } },
      });
      await prisma.message.deleteMany({
        where: { id: { in: createdMessageIds } },
      });
    }
  });

  if (!TEST_SCHEDULED_SMS_PHONE) {
    it("skips when scheduled test targets are missing", () => {
      console.log(
        "[Scheduled Integration] Set TEST_SCHEDULED_SMS_PHONE (or queue/direct SMS phone vars) to run real scheduled SMS sends."
      );
      expect(Boolean(TEST_SCHEDULED_SMS_PHONE)).toBe(false);
    });
    return;
  }

  it("processes scheduled SMS through cron then queue consumer", async () => {
    const schedule = getScheduledExecutionConfig();

    const smsReq = new NextRequest("http://localhost/api/v1/sms/send", {
      method: "POST",
      body: JSON.stringify({
        to: TEST_SCHEDULED_SMS_PHONE,
        text: `ReachDem scheduled SMS test ${new Date().toISOString()}`,
        from: getExpectedSmsSender(TEST_SCHEDULED_SMS_PHONE),
        idempotency_key: `scheduled-sms-${Date.now()}`,
        scheduledAt: schedule.scheduledAtIso,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const smsRes = await sendSmsHandler(smsReq, {} as any);
    const smsBody = await smsRes.json();

    expect(smsBody.status).toBe("scheduled");
    createdMessageIds.push(smsBody.message_id);

    const queuedSmsJobs: SmsMessage[] = [];
    const env = createWorkerEnv(queuedSmsJobs);

    const originalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (
          url.startsWith(
            "http://localhost:3000/api/internal/messages/scheduled"
          )
        ) {
          const req = new NextRequest(url, {
            method: "GET",
            headers: {
              "x-internal-secret": INTERNAL_API_SECRET,
            },
          });
          return getScheduledHandler(req);
        }

        if (url === "http://localhost:3000/api/internal/messages/status") {
          const req = new NextRequest(url, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "x-internal-secret": INTERNAL_API_SECRET,
            },
            body: init?.body,
          });
          return updateMessageStatusHandler(req);
        }

        return originalFetch(input, init);
      })
    );

    console.log(
      `[Scheduled Integration][SMS] mode=${schedule.mode} scheduledAt=${schedule.scheduledAtIso}`
    );

    await waitForScheduledExecution(schedule);

    const controller: ScheduledController = {
      cron: "* * * * *",
      scheduledTime: schedule.cronScheduledTimeMs,
    };

    await handleScheduled(controller, env);

    expect(queuedSmsJobs).toHaveLength(1);

    const smsEnvelope = createEnvelope(queuedSmsJobs[0]);

    await handleSmsBatch(
      {
        queue: "reachdem-sms-queue",
        messages: [smsEnvelope],
      } satisfies MessageBatch<SmsMessage>,
      env
    );

    const smsMessage = await prisma.message.findUnique({
      where: { id: smsBody.message_id },
      include: { attempts: true },
    });

    expect(smsEnvelope.ack).toHaveBeenCalledTimes(1);
    expect(smsMessage!.status).toBe("sent");

    console.log(
      `[Scheduled Integration] SMS selected=${smsMessage!.providerSelected} attempts=${smsMessage!.attempts.length}`
    );
  }, 180_000);
});
