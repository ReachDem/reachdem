import { describe, it, expect, vi, beforeAll } from "vitest";
import {
  POST as createCampaignHandler,
  GET as listCampaignsHandler,
} from "../app/api/v1/campaigns/route";
import {
  GET as getCampaignHandler,
  PATCH as updateCampaignHandler,
  DELETE as deleteCampaignHandler,
} from "../app/api/v1/campaigns/[id]/route";
import {
  POST as setAudienceHandler,
  GET as getAudienceHandler,
} from "../app/api/v1/campaigns/[id]/audience/route";
import { POST as launchCampaignHandler } from "../app/api/v1/campaigns/[id]/launch/route";

import { prisma } from "@reachdem/database";
import { SegmentNode, type CampaignLaunchJob } from "@reachdem/shared";
import {
  ProcessEmailMessageJobUseCase,
  ProcessSmsMessageJobUseCase,
} from "@reachdem/core";
import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { handleCampaignLaunchBatch } from "../../workers/src/campaign-launch";
import type {
  Env,
  MessageBatch,
  QueueMessageEnvelope,
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

if (!REAL_ORG_ID || !TEST_USER_ID || !TEST_USER_EMAIL) {
  throw new Error(
    "Missing required test env vars: TEST_ORG_ID, TEST_USER_ID, TEST_USER_EMAIL"
  );
}

describe("Campaigns API - REAL DATABASE INTEGRATION", () => {
  let testCampaignId: string;
  let testGroupId: string;
  let testContactId: string;
  let testEmailCampaignId: string;
  let testSegmentId: string;
  let foreignGroupId: string;
  let smsConfigCreated = false;
  const queuedCampaignLaunchJobs: CampaignLaunchJob[] = [];
  const segmentMatchAddress = `Campaign Segment Match ${Date.now()}`;
  const workerBaseUrl =
    process.env.SMS_WORKER_BASE_URL ??
    process.env.CLOUDFLARE_WORKER_BASE_URL ??
    "http://127.0.0.1:8787";

  beforeAll(async () => {
    // 1. Mock authentication
    authMock.api.getSession.mockResolvedValue({
      user: { id: TEST_USER_ID, name: "Test User", email: TEST_USER_EMAIL },
      session: {
        activeOrganizationId: REAL_ORG_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await prisma.organization.update({
      where: { id: REAL_ORG_ID },
      data: {
        planCode: "free",
        workspaceVerificationStatus: "verified",
        workspaceVerifiedAt: new Date(),
        senderId: "REACHDEM",
        creditBalance: 5000,
        smsQuotaUsed: 0,
        emailQuotaUsed: 0,
      },
    });

    // 2. Setup a group and contact for audience
    const group = await prisma.group.create({
      data: {
        organizationId: REAL_ORG_ID,
        name: `Test Campaign Group ${Date.now()}`,
      },
    });
    testGroupId = group.id;

    const contact = await prisma.contact.create({
      data: {
        organizationId: REAL_ORG_ID,
        phoneE164: "+14155552671",
        email: `campaign-contact-${Date.now()}@example.com`,
        name: "Test Contact",
        address: segmentMatchAddress,
        memberships: {
          create: { groupId: testGroupId },
        },
      },
    });
    testContactId = contact.id;

    const segmentDefinition: SegmentNode = {
      op: "AND",
      children: [
        {
          field: "address",
          operator: "eq",
          type: "string",
          value: segmentMatchAddress,
        },
      ],
    };

    const segment = await prisma.segment.create({
      data: {
        organizationId: REAL_ORG_ID,
        name: `Campaign Segment ${Date.now()}`,
        definition: segmentDefinition as any,
      },
    });
    testSegmentId = segment.id;

    const foreignOrg = await prisma.organization.create({
      data: {
        id: randomUUID(),
        name: `Campaign Foreign Org ${Date.now()}`,
        slug: `campaign-foreign-org-${Date.now()}`,
      },
    });

    const foreignGroup = await prisma.group.create({
      data: {
        organizationId: foreignOrg.id,
        name: `Foreign Campaign Group ${Date.now()}`,
      },
    });
    foreignGroupId = foreignGroup.id;

    // 3. Ensure Stub config
    const existing = await prisma.workspaceSmsConfig.findUnique({
      where: { organizationId: REAL_ORG_ID },
    });
    if (!existing) {
      await prisma.workspaceSmsConfig.create({
        data: {
          organizationId: REAL_ORG_ID,
          primaryProvider: "stub",
          secondaryProviders: [],
        },
      });
      smsConfigCreated = true;
    }

    const originalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (
          url === `${workerBaseUrl}/queue/campaign-launch` ||
          url === `${workerBaseUrl}/queue/sms` ||
          url === `${workerBaseUrl}/queue/email`
        ) {
          if (url === `${workerBaseUrl}/queue/campaign-launch` && init?.body) {
            queuedCampaignLaunchJobs.push(
              JSON.parse(String(init.body)) as CampaignLaunchJob
            );
          }
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return originalFetch(input, init);
      })
    );
  }, 30000);

  // Note: We don't cleanup because Database cleanup is handled globally or kept for inspection.

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

  it("POST /campaigns -> creates a draft campaign", async () => {
    const payload = {
      name: "Integration Test Campaign",
      channel: "sms",
      content: {
        text: "Hello from Vitest!",
        from: "ReachDem Campaign",
      },
    };

    const req = new NextRequest("http://localhost/api/v1/campaigns", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const res = await createCampaignHandler(req, {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(201);
    const body = await res.json();

    expect(body.name).toBe(payload.name);
    expect(body.content).toEqual(payload.content);
    expect(body.status).toBe("draft");
    expect(body.organizationId).toBe(REAL_ORG_ID);

    testCampaignId = body.id;
  });

  it("PATCH /campaigns/:id -> updates the campaign", async () => {
    const payload = {
      description: "Updated description via PATCH",
    };

    const req = new NextRequest(
      `http://localhost/api/v1/campaigns/${testCampaignId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );

    const res = await updateCampaignHandler(req, {
      params: Promise.resolve({ id: testCampaignId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.description).toBe(payload.description);
  });

  it("POST /campaigns/:id/audience -> sets the audience", async () => {
    const payload = {
      audiences: [
        { sourceType: "group", sourceId: testGroupId },
        { sourceType: "segment", sourceId: testSegmentId },
      ],
    };

    const req = new NextRequest(
      `http://localhost/api/v1/campaigns/${testCampaignId}/audience`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const res = await setAudienceHandler(req, {
      params: Promise.resolve({ id: testCampaignId }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();

    expect(body).toHaveLength(2);
    expect(body[0].sourceType).toBe("group");
    expect(body[0].sourceId).toBe(testGroupId);
    expect(body[1].sourceType).toBe("segment");
    expect(body[1].sourceId).toBe(testSegmentId);
  });

  it("POST /campaigns/:id/audience -> rejects sources outside the workspace", async () => {
    const createReq = new NextRequest("http://localhost/api/v1/campaigns", {
      method: "POST",
      body: JSON.stringify({
        name: `Cross workspace campaign ${Date.now()}`,
        channel: "sms",
        content: { text: "Audience validation", from: "ReachDem Campaign" },
      }),
    });

    const createRes = await createCampaignHandler(createReq, {
      params: Promise.resolve({}),
    });
    expect(createRes.status).toBe(201);
    const createdCampaign = await createRes.json();

    const req = new NextRequest(
      `http://localhost/api/v1/campaigns/${createdCampaign.id}/audience`,
      {
        method: "POST",
        body: JSON.stringify({
          audiences: [{ sourceType: "group", sourceId: foreignGroupId }],
        }),
      }
    );

    const res = await setAudienceHandler(req, {
      params: Promise.resolve({ id: createdCampaign.id }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();

    expect(body.details).toMatch(/outside this workspace/);
  });

  it("POST /campaigns/:id/launch -> enqueues campaign messages for async delivery", async () => {
    const req = new NextRequest(
      `http://localhost/api/v1/campaigns/${testCampaignId}/launch`,
      {
        method: "POST",
      }
    );

    const res = await launchCampaignHandler(req, {
      params: Promise.resolve({ id: testCampaignId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.message).toMatch(/queued successfully/);
    expect(queuedCampaignLaunchJobs).toHaveLength(1);

    await handleCampaignLaunchBatch(
      {
        queue: "reachdem-campaign-launch-queue",
        messages: queuedCampaignLaunchJobs
          .splice(0)
          .map((job) => createEnvelope(job)),
      } satisfies MessageBatch<CampaignLaunchJob>,
      createWorkerEnv()
    );

    // Verify DB State
    const campaign = await prisma.campaign.findUnique({
      where: { id: testCampaignId },
    });
    expect(campaign!.status).toBe("running");

    const targets = await prisma.campaignTarget.findMany({
      where: { campaignId: testCampaignId },
    });
    expect(targets).toHaveLength(1);
    expect(targets[0].status).toBe("pending");
    expect(targets[0].messageId).toBeDefined();

    const message = await prisma.message.findUnique({
      where: { id: targets[0].messageId! },
    });
    expect(message).toBeDefined();
    expect(message!.campaignId).toBe(testCampaignId);
    expect(message!.status).toBe("queued");

    const activity = await prisma.activityEvent.findFirst({
      where: {
        organizationId: REAL_ORG_ID,
        resourceType: "campaign",
        resourceId: testCampaignId,
        action: "updated",
      },
      orderBy: { createdAt: "desc" },
    });

    expect(activity).toBeDefined();
    // Use type assertion since meta is typed as Prisma.JsonValue in the strict DB schema
    const metaObj = activity!.meta as {
      queuedCount?: number;
      scheduledCount?: number;
      targetCount?: number;
    };
    expect(
      metaObj?.queuedCount ?? metaObj?.scheduledCount ?? metaObj?.targetCount
    ).toBeDefined();

    const outcome = await ProcessSmsMessageJobUseCase.execute(
      {
        message_id: message!.id,
        organization_id: REAL_ORG_ID,
        channel: "sms",
        delivery_cycle: 1,
      },
      {
        republish: async () => {
          throw new Error("Unexpected republish for stub-backed campaign test");
        },
      }
    );

    expect(outcome).toBe("sent");

    const processedCampaign = await prisma.campaign.findUnique({
      where: { id: testCampaignId },
    });
    const processedTarget = await prisma.campaignTarget.findUnique({
      where: { id: targets[0].id },
    });
    const processedMessage = await prisma.message.findUnique({
      where: { id: message!.id },
    });

    expect(processedCampaign!.status).toBe("completed");
    expect(processedTarget!.status).toBe("sent");
    expect(processedMessage!.status).toBe("sent");
  }, 40000);

  it("POST /campaigns/:id/launch -> charges experimental SMS usage from shared credits", async () => {
    await prisma.organization.update({
      where: { id: REAL_ORG_ID },
      data: {
        planCode: "experimental",
        creditBalance: 5000,
        smsQuotaUsed: 0,
        emailQuotaUsed: 0,
        workspaceVerificationStatus: "verified",
        workspaceVerifiedAt: new Date(),
        senderId: "REACHDEM",
      },
    });

    const createReq = new NextRequest("http://localhost/api/v1/campaigns", {
      method: "POST",
      body: JSON.stringify({
        name: `Experimental SMS campaign ${Date.now()}`,
        channel: "sms",
        content: {
          text: "Experimental quota test",
          from: "Another Sender",
        },
      }),
    });

    const createRes = await createCampaignHandler(createReq, {
      params: Promise.resolve({}),
    });
    expect(createRes.status).toBe(201);
    const createdCampaign = await createRes.json();

    const audienceReq = new NextRequest(
      `http://localhost/api/v1/campaigns/${createdCampaign.id}/audience`,
      {
        method: "POST",
        body: JSON.stringify({
          audiences: [{ sourceType: "group", sourceId: testGroupId }],
        }),
      }
    );
    const audienceRes = await setAudienceHandler(audienceReq, {
      params: Promise.resolve({ id: createdCampaign.id }),
    });
    expect(audienceRes.status).toBe(201);

    const launchRes = await launchCampaignHandler(
      new NextRequest(
        `http://localhost/api/v1/campaigns/${createdCampaign.id}/launch`,
        {
          method: "POST",
        }
      ),
      { params: Promise.resolve({ id: createdCampaign.id }) }
    );
    expect(launchRes.status).toBe(200);

    const organization = await prisma.organization.findUnique({
      where: { id: REAL_ORG_ID },
    });
    expect(organization?.smsQuotaUsed).toBe(1);
    expect(organization?.creditBalance).toBe(4975);

    const updatedCampaign = await prisma.campaign.findUnique({
      where: { id: createdCampaign.id },
    });
    expect((updatedCampaign?.content as any)?.senderId).toBe("REACHDEM");
    expect((updatedCampaign?.content as any)?.from).toBe("REACHDEM");

    queuedCampaignLaunchJobs.splice(0);
  });

  it("POST /campaigns and launch -> supports email campaigns through async processing", async () => {
    queuedCampaignLaunchJobs.splice(0);

    const createReq = new NextRequest("http://localhost/api/v1/campaigns", {
      method: "POST",
      body: JSON.stringify({
        name: `Email campaign ${Date.now()}`,
        channel: "email",
        content: {
          subject: "ReachDem Email Campaign",
          html: "<p>Hello from email campaign</p>",
          from: "ReachDem Notifications",
        },
      }),
    });

    const createRes = await createCampaignHandler(createReq, {
      params: Promise.resolve({}),
    });
    expect(createRes.status).toBe(201);
    const createdCampaign = await createRes.json();
    testEmailCampaignId = createdCampaign.id;

    const audienceReq = new NextRequest(
      `http://localhost/api/v1/campaigns/${testEmailCampaignId}/audience`,
      {
        method: "POST",
        body: JSON.stringify({
          audiences: [{ sourceType: "group", sourceId: testGroupId }],
        }),
      }
    );

    const audienceRes = await setAudienceHandler(audienceReq, {
      params: Promise.resolve({ id: testEmailCampaignId }),
    });
    expect(audienceRes.status).toBe(201);

    const launchReq = new NextRequest(
      `http://localhost/api/v1/campaigns/${testEmailCampaignId}/launch`,
      {
        method: "POST",
      }
    );

    const launchRes = await launchCampaignHandler(launchReq, {
      params: Promise.resolve({ id: testEmailCampaignId }),
    });
    expect(launchRes.status).toBe(200);
    expect(queuedCampaignLaunchJobs).toHaveLength(1);

    await handleCampaignLaunchBatch(
      {
        queue: "reachdem-campaign-launch-queue",
        messages: queuedCampaignLaunchJobs
          .splice(0)
          .map((job) => createEnvelope(job)),
      } satisfies MessageBatch<CampaignLaunchJob>,
      createWorkerEnv()
    );

    const emailTarget = await prisma.campaignTarget.findFirst({
      where: { campaignId: testEmailCampaignId },
    });
    expect(emailTarget).toBeDefined();
    expect(emailTarget!.messageId).toBeDefined();

    const emailMessage = await prisma.message.findUnique({
      where: { id: emailTarget!.messageId! },
    });
    expect(emailMessage!.channel).toBe("email");
    expect(emailMessage!.status).toBe("queued");

    const outcome = await ProcessEmailMessageJobUseCase.execute(
      {
        message_id: emailMessage!.id,
        organization_id: REAL_ORG_ID,
        channel: "email",
        delivery_cycle: 1,
      },
      {
        republish: async () => {
          throw new Error(
            "Unexpected republish for email stub-backed campaign test"
          );
        },
        sendEmail: async () => ({
          success: true,
          providerName: "smtp",
          providerMessageId: "email-campaign-ok",
          durationMs: 1,
        }),
      }
    );

    expect(outcome).toBe("sent");

    const processedCampaign = await prisma.campaign.findUnique({
      where: { id: testEmailCampaignId },
    });
    const processedTarget = await prisma.campaignTarget.findUnique({
      where: { id: emailTarget!.id },
    });
    const processedMessage = await prisma.message.findUnique({
      where: { id: emailMessage!.id },
    });

    expect(processedCampaign!.status).toBe("completed");
    expect(processedTarget!.status).toBe("sent");
    expect(processedMessage!.status).toBe("sent");
  }, 40000);

  it("DELETE /campaigns/:id -> fails to delete non-draft campaign", async () => {
    const req = new NextRequest(
      `http://localhost/api/v1/campaigns/${testCampaignId}`,
      {
        method: "DELETE",
      }
    );

    const res = await deleteCampaignHandler(req, {
      params: Promise.resolve({ id: testCampaignId }),
    });
    expect(res.status).toBe(400); // Because it's "completed", not "draft"
  });

  it("POST /campaigns/:id/audience -> fails once campaign is no longer draft", async () => {
    const req = new NextRequest(
      `http://localhost/api/v1/campaigns/${testCampaignId}/audience`,
      {
        method: "POST",
        body: JSON.stringify({
          audiences: [{ sourceType: "group", sourceId: testGroupId }],
        }),
      }
    );

    const res = await setAudienceHandler(req, {
      params: Promise.resolve({ id: testCampaignId }),
    });
    expect(res.status).toBe(400);
  });
});
