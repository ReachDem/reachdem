import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@reachdem/database";
import { auth } from "@reachdem/auth";
import { getCameroonProviderRoute, isOrange } from "@reachdem/core";
import { POST as sendSmsHandler } from "../app/api/v1/sms/send/route";
import { handleSmsBatch } from "../../workers/src/queue-sms";
import type {
  Env,
  MessageBatch,
  QueueMessageEnvelope,
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
const TEST_QUEUE_SMS_PHONE =
  process.env.TEST_QUEUE_SMS_PHONE ??
  process.env.TEST_AVLYTEXT_SMS_PHONE ??
  process.env.TEST_MBOA_SMS_PHONE ??
  process.env.TEST_ORANGE_PHONE_1 ??
  process.env.TEST_MTN_PHONE_1;
const TEST_AVLYTEXT_SMS_SENDER =
  process.env.TEST_AVLYTEXT_SMS_SENDER ?? "ReachDem Orange";
const LMT_SENDER_ID = process.env.LMT_SENDER_ID ?? "ReachDem";

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

function createWorkerEnv(): Env {
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
    INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET ?? "test-secret",
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

describe("Messaging queue - real worker integration", () => {
  const createdMessageIds: string[] = [];
  const workerBaseUrl =
    process.env.CLOUDFLARE_WORKER_BASE_URL ?? "http://127.0.0.1:8787";

  beforeEach(() => {
    vi.clearAllMocks();
    const originalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (
          url === `${workerBaseUrl}/queue/sms` ||
          url === `${workerBaseUrl}/queue/email`
        ) {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return originalFetch(input, init);
      })
    );

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

  if (!TEST_QUEUE_SMS_PHONE) {
    it("skips when queue test targets are missing", () => {
      console.log(
        "[Queue Integration] Set TEST_QUEUE_SMS_PHONE (or direct SMS phone vars) to run real SMS queue sends."
      );
      expect(Boolean(TEST_QUEUE_SMS_PHONE)).toBe(false);
    });
    return;
  }

  it("processes a queued SMS through the worker consumer", async () => {
    const req = new NextRequest("http://localhost/api/v1/sms/send", {
      method: "POST",
      body: JSON.stringify({
        to: TEST_QUEUE_SMS_PHONE,
        text: `ReachDem worker queue SMS test ${new Date().toISOString()}`,
        from: getExpectedSmsSender(TEST_QUEUE_SMS_PHONE),
        idempotency_key: `worker-queue-sms-${Date.now()}`,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await sendSmsHandler(req, {} as any);
    const body = await res.json();
    expect([200, 201]).toContain(res.status);
    expect(body.status).toBe("queued");
    createdMessageIds.push(body.message_id);

    const env = createWorkerEnv();
    const envelope = createEnvelope<SmsMessage>({
      message_id: body.message_id,
      organization_id: REAL_ORG_ID!,
      channel: "sms",
      delivery_cycle: 1,
    });
    const batch: MessageBatch<SmsMessage> = {
      queue: "reachdem-sms-queue",
      messages: [envelope],
    };

    await handleSmsBatch(batch, env);

    const message = await prisma.message.findUnique({
      where: { id: body.message_id },
      include: { attempts: true },
    });

    expect(envelope.ack).toHaveBeenCalledTimes(1);
    expect(message).not.toBeNull();
    expect(message!.status).toBe("sent");
    expect(message!.attempts.length).toBeGreaterThanOrEqual(1);

    console.log(
      `[Queue Integration][SMS] to=${TEST_QUEUE_SMS_PHONE} selected=${message!.providerSelected} attempts=${message!.attempts.length}`
    );
  }, 120_000);
});
