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
import { SegmentNode } from "@reachdem/shared";
import { NextRequest } from "next/server";
import { randomUUID } from "crypto";

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
  let testSegmentId: string;
  let foreignGroupId: string;
  let smsConfigCreated = false;
  const segmentMatchAddress = `Campaign Segment Match ${Date.now()}`;

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
  }, 30000);

  // Note: We don't cleanup because Database cleanup is handled globally or kept for inspection.

  it("POST /campaigns -> creates a draft campaign", async () => {
    const payload = {
      name: "Integration Test Campaign",
      content: "Hello from Vitest!",
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
    expect(body.content).toBe(payload.content);
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
        content: "Audience validation",
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

  it("POST /campaigns/:id/launch -> executes the campaign", async () => {
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

    expect(body.message).toMatch(/launched successfully/);

    // Verify DB State
    const campaign = await prisma.campaign.findUnique({
      where: { id: testCampaignId },
    });
    expect(campaign!.status).toBe("completed");

    const targets = await prisma.campaignTarget.findMany({
      where: { campaignId: testCampaignId },
    });
    expect(targets).toHaveLength(1);
    expect(targets[0].status).toBe("sent");
    expect(targets[0].messageId).toBeDefined();

    const message = await prisma.message.findUnique({
      where: { id: targets[0].messageId! },
    });
    expect(message).toBeDefined();
    expect(message!.campaignId).toBe(testCampaignId);

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
      sentCount?: number;
      targetCount?: number;
    };
    expect(metaObj?.sentCount ?? metaObj?.targetCount).toBeDefined();
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
