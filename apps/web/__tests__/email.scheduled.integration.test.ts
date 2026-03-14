import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@reachdem/database";
import { auth } from "@reachdem/auth";
import { POST as sendEmailHandler } from "../app/api/v1/email/send/route";
import { GET as getScheduledHandler } from "../app/api/internal/messages/scheduled/route";
import { PATCH as updateMessageStatusHandler } from "../app/api/internal/messages/status/route";
import { handleScheduled } from "../../workers/src/scheduled";
import { handleEmailBatch } from "../../workers/src/queue-email";
import type {
  EmailMessage,
  Env,
  MessageBatch,
  QueueMessageEnvelope,
  ScheduledController,
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
const TEST_EMAIL_TO = process.env.TEST_EMAIL_TO;

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ?? "465";
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_SECURE = process.env.SMTP_SECURE ?? "true";
const SENDER_EMAIL =
  process.env.SENDER_EMAIL ?? process.env.ALIBABA_SENDER_EMAIL ?? SMTP_USER;
const SENDER_NAME =
  process.env.SENDER_NAME ??
  process.env.ALIBABA_SENDER_NAME ??
  "ReachDem Notifications";
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

function createWorkerEnv(emailJobs: EmailMessage[]): Env {
  return {
    SMS_QUEUE: {
      send: vi.fn().mockResolvedValue(undefined),
    },
    EMAIL_QUEUE: {
      send: vi.fn(async (job: EmailMessage) => {
        emailJobs.push(job);
      }),
    },
    ENVIRONMENT: "test",
    API_BASE_URL: "http://localhost:3000",
    INTERNAL_API_SECRET,
    SMTP_HOST: SMTP_HOST ?? "",
    SMTP_PORT,
    SMTP_USER: SMTP_USER ?? "",
    SMTP_PASSWORD: SMTP_PASSWORD ?? "",
    SMTP_SECURE,
    SENDER_EMAIL: SENDER_EMAIL ?? "",
    SENDER_NAME,
  };
}

describe("Email scheduled - real worker integration", () => {
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

  if (
    !TEST_EMAIL_TO ||
    !SMTP_HOST ||
    !SMTP_USER ||
    !SMTP_PASSWORD ||
    !SENDER_EMAIL
  ) {
    it("skips when scheduled email env vars are missing", () => {
      console.log(
        "[Scheduled Email Integration] Set TEST_EMAIL_TO, SMTP_HOST, SMTP_USER, SMTP_PASSWORD and SENDER_EMAIL to run real scheduled email sends."
      );
      expect(
        Boolean(
          TEST_EMAIL_TO &&
          SMTP_HOST &&
          SMTP_USER &&
          SMTP_PASSWORD &&
          SENDER_EMAIL
        )
      ).toBe(false);
    });
    return;
  }

  it("processes a scheduled email through cron then queue consumer", async () => {
    const scheduledAt = new Date(Date.now() - 60_000).toISOString();

    const emailReq = new NextRequest("http://localhost/api/v1/email/send", {
      method: "POST",
      body: JSON.stringify({
        to: TEST_EMAIL_TO,
        subject: `ReachDem scheduled email test ${new Date().toISOString()}`,
        html: `
            <h2>ReachDem scheduled email test</h2>
            <p>This email went through cron then queue consumer.</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          `,
        from: SENDER_NAME,
        idempotency_key: `scheduled-email-${Date.now()}`,
        scheduledAt,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const emailRes = await sendEmailHandler(emailReq, {} as any);
    const emailBody = await emailRes.json();

    expect(emailBody.status).toBe("scheduled");
    createdMessageIds.push(emailBody.message_id);

    const queuedEmailJobs: EmailMessage[] = [];
    const env = createWorkerEnv(queuedEmailJobs);

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

    const controller: ScheduledController = {
      cron: "* * * * *",
      scheduledTime: Date.now(),
    };

    await handleScheduled(controller, env);

    expect(queuedEmailJobs).toHaveLength(1);

    const emailEnvelope = createEnvelope(queuedEmailJobs[0]);

    await handleEmailBatch(
      {
        queue: "reachdem-email-queue",
        messages: [emailEnvelope],
      } satisfies MessageBatch<EmailMessage>,
      env
    );

    const emailMessage = await prisma.message.findUnique({
      where: { id: emailBody.message_id },
      include: { attempts: true },
    });

    expect(emailEnvelope.ack).toHaveBeenCalledTimes(1);
    expect(emailMessage).not.toBeNull();
    expect(emailMessage!.status).toBe("sent");
    expect(emailMessage!.providerSelected).toBe("smtp");
    expect(emailMessage!.attempts).toHaveLength(1);

    console.log(
      `[Scheduled Email Integration] selected=${emailMessage!.providerSelected} attempts=${emailMessage!.attempts.length}`
    );
  }, 180_000);
});
