import { beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@reachdem/database";
import { POST as createCampaignHandler } from "../app/api/v1/campaigns/route";
import { POST as setAudienceHandler } from "../app/api/v1/campaigns/[id]/audience/route";
import { POST as launchCampaignHandler } from "../app/api/v1/campaigns/[id]/launch/route";
import { GET as getScheduledHandler } from "../app/api/internal/messages/scheduled/route";
import { PATCH as updateMessageStatusHandler } from "../app/api/internal/messages/status/route";
import { handleScheduled } from "../../workers/src/scheduled";
import { handleEmailBatch } from "../../workers/src/queue-email";
import {
  getScheduledExecutionConfig,
  waitForScheduledExecution,
} from "./utils/scheduled-test";
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
const TEST_CAMPAIGN_EMAILS_RAW =
  process.env.TEST_CAMPAIGN_EMAILS ?? process.env.TEST_EMAIL_TO ?? "";
const TEST_CAMPAIGN_EMAILS = TEST_CAMPAIGN_EMAILS_RAW.split(",")
  .map((email) => email.trim())
  .filter(Boolean);
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

describe("Campaigns Email - REAL SCHEDULED WORKER INTEGRATION", () => {
  let testGroupId: string;

  beforeAll(async () => {
    authMock.api.getSession.mockResolvedValue({
      user: { id: TEST_USER_ID, name: "Test User", email: TEST_USER_EMAIL },
      session: {
        activeOrganizationId: REAL_ORG_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const group = await prisma.group.create({
      data: {
        organizationId: REAL_ORG_ID,
        name: `Scheduled Email Campaign Group ${Date.now()}`,
      },
    });
    testGroupId = group.id;

    for (const [index, email] of TEST_CAMPAIGN_EMAILS.entries()) {
      await prisma.contact.create({
        data: {
          organizationId: REAL_ORG_ID,
          email,
          name: `Scheduled Email Campaign Contact ${index + 1}`,
          memberships: {
            create: { groupId: testGroupId },
          },
        },
      });
    }
  }, 30_000);

  if (
    TEST_CAMPAIGN_EMAILS.length === 0 ||
    !SMTP_HOST ||
    !SMTP_USER ||
    !SMTP_PASSWORD ||
    !SENDER_EMAIL
  ) {
    it("skips when campaign scheduled email env vars are missing", () => {
      console.log(
        "[Campaign Email Scheduled Real] Set TEST_CAMPAIGN_EMAILS (or TEST_EMAIL_TO), SMTP_HOST, SMTP_USER, SMTP_PASSWORD and SENDER_EMAIL to run the real scheduled email campaign flow."
      );
      expect(
        Boolean(
          TEST_CAMPAIGN_EMAILS.length > 0 &&
          SMTP_HOST &&
          SMTP_USER &&
          SMTP_PASSWORD &&
          SENDER_EMAIL
        )
      ).toBe(false);
    });
    return;
  }

  it("launches a scheduled email campaign, then sends it through cron and the worker queue", async () => {
    const schedule = getScheduledExecutionConfig();

    const createReq = new NextRequest("http://localhost/api/v1/campaigns", {
      method: "POST",
      body: JSON.stringify({
        name: `Scheduled Email Campaign ${Date.now()}`,
        channel: "email",
        content: {
          subject: `ReachDem scheduled email campaign ${new Date().toISOString()}`,
          html: `<p>ReachDem scheduled email campaign at ${new Date().toISOString()}</p>`,
          from: SENDER_NAME,
        },
        scheduledAt: schedule.scheduledAtIso,
      }),
    });

    const createRes = await createCampaignHandler(createReq, {
      params: Promise.resolve({}),
    });
    expect(createRes.status).toBe(201);
    const campaign = await createRes.json();

    const audienceReq = new NextRequest(
      `http://localhost/api/v1/campaigns/${campaign.id}/audience`,
      {
        method: "POST",
        body: JSON.stringify({
          audiences: [{ sourceType: "group", sourceId: testGroupId }],
        }),
      }
    );

    const audienceRes = await setAudienceHandler(audienceReq, {
      params: Promise.resolve({ id: campaign.id }),
    });
    expect(audienceRes.status).toBe(201);

    const launchReq = new NextRequest(
      `http://localhost/api/v1/campaigns/${campaign.id}/launch`,
      {
        method: "POST",
      }
    );

    const launchRes = await launchCampaignHandler(launchReq, {
      params: Promise.resolve({ id: campaign.id }),
    });
    expect(launchRes.status).toBe(200);

    const scheduledTargets = await prisma.campaignTarget.findMany({
      where: { campaignId: campaign.id },
      orderBy: { createdAt: "asc" },
    });
    expect(scheduledTargets).toHaveLength(TEST_CAMPAIGN_EMAILS.length);

    const scheduledMessages = await prisma.message.findMany({
      where: {
        id: {
          in: scheduledTargets
            .map((target) => target.messageId!)
            .filter(Boolean),
        },
      },
      orderBy: { createdAt: "asc" },
    });
    expect(scheduledMessages).toHaveLength(TEST_CAMPAIGN_EMAILS.length);
    expect(
      scheduledMessages.every((message) => message.status === "scheduled")
    ).toBe(true);

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

    console.log(
      `[Campaign Email Scheduled Real] mode=${schedule.mode} scheduledAt=${schedule.scheduledAtIso} recipients=${TEST_CAMPAIGN_EMAILS.length}`
    );

    await waitForScheduledExecution(schedule);

    const controller: ScheduledController = {
      cron: "* * * * *",
      scheduledTime: schedule.cronScheduledTimeMs,
    };

    await handleScheduled(controller, env);

    expect(queuedEmailJobs).toHaveLength(TEST_CAMPAIGN_EMAILS.length);

    const envelopes = queuedEmailJobs.map((job) => createEnvelope(job));

    await handleEmailBatch(
      {
        queue: "reachdem-email-queue",
        messages: envelopes,
      } satisfies MessageBatch<EmailMessage>,
      env
    );

    const processedCampaign = await prisma.campaign.findUnique({
      where: { id: campaign.id },
    });
    const processedTargets = await prisma.campaignTarget.findMany({
      where: { campaignId: campaign.id },
      orderBy: { createdAt: "asc" },
    });
    const processedMessages = await prisma.message.findMany({
      where: { id: { in: scheduledMessages.map((message) => message.id) } },
      include: { attempts: true },
      orderBy: { createdAt: "asc" },
    });

    expect(
      envelopes.every((envelope) => envelope.ack.mock.calls.length === 1)
    ).toBe(true);
    expect(processedCampaign!.status).toBe("completed");
    expect(processedTargets.every((target) => target.status === "sent")).toBe(
      true
    );
    expect(
      processedMessages.every((message) => message.status === "sent")
    ).toBe(true);
    expect(
      processedMessages.every((message) => message.providerSelected === "smtp")
    ).toBe(true);

    console.log(
      `[Campaign Email Scheduled Real] campaign=${campaign.id} recipients=${TEST_CAMPAIGN_EMAILS.length} provider=smtp`
    );
  }, 420_000);
});
