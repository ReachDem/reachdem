import { beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@reachdem/database";
import { randomUUID } from "crypto";
import { SegmentNode } from "@reachdem/shared";
import { POST as createCampaignHandler } from "../app/api/v1/campaigns/route";
import { POST as setAudienceHandler } from "../app/api/v1/campaigns/[id]/audience/route";
import { POST as launchCampaignHandler } from "../app/api/v1/campaigns/[id]/launch/route";
import { GET as getCampaignStatsHandler } from "../app/api/v1/campaigns/[id]/stats/route";
import { ProcessSmsMessageJobUseCase } from "@reachdem/core";

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
const SINK_API_BASE_URL = process.env.SINK_API_BASE_URL ?? "https://rcdm.ink";

if (!REAL_ORG_ID || !TEST_USER_ID || !TEST_USER_EMAIL) {
  throw new Error(
    "Missing required test env vars: TEST_ORG_ID, TEST_USER_ID, TEST_USER_EMAIL"
  );
}

describe("Campaign Stats API - integration", () => {
  let testCampaignId: string;
  let testGroupId: string;
  let testSegmentId: string;

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
        name: `Campaign Stats Group ${Date.now()}`,
      },
    });
    testGroupId = group.id;

    await prisma.contact.createMany({
      data: [
        {
          organizationId: REAL_ORG_ID,
          phoneE164: "+14155552671",
          email: `stats-contact-1-${Date.now()}@example.com`,
          name: "Stats Contact 1",
          address: "stats-segment",
        },
        {
          organizationId: REAL_ORG_ID,
          phoneE164: "+14155552672",
          email: `stats-contact-2-${Date.now()}@example.com`,
          name: "Stats Contact 2",
          address: "stats-segment",
        },
      ],
    });

    const contacts = await prisma.contact.findMany({
      where: { organizationId: REAL_ORG_ID, address: "stats-segment" },
      orderBy: { createdAt: "asc" },
      take: 2,
    });

    await prisma.groupMember.createMany({
      data: contacts.map((contact) => ({
        groupId: testGroupId,
        contactId: contact.id,
      })),
      skipDuplicates: true,
    });

    const segmentDefinition: SegmentNode = {
      op: "AND",
      children: [
        {
          field: "address",
          operator: "eq",
          type: "string",
          value: "stats-segment",
        },
      ],
    };

    const segment = await prisma.segment.create({
      data: {
        organizationId: REAL_ORG_ID,
        name: `Campaign Stats Segment ${Date.now()}`,
        definition: segmentDefinition as any,
      },
    });
    testSegmentId = segment.id;

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
    }

    const workerBaseUrl =
      process.env.SMS_WORKER_BASE_URL ??
      process.env.CLOUDFLARE_WORKER_BASE_URL ??
      "http://127.0.0.1:8787";
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

        if (url.startsWith(`${SINK_API_BASE_URL}/api/stats/counters?slug=`)) {
          return new Response(
            JSON.stringify({
              data: [
                {
                  visits: "12",
                  visitors: 9,
                  referers: 2,
                },
              ],
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        return originalFetch(input, init);
      })
    );
  }, 30_000);

  it("GET /campaigns/:id/stats aggregates delivery and tracked link clicks", async () => {
    const createReq = new NextRequest("http://localhost/api/v1/campaigns", {
      method: "POST",
      body: JSON.stringify({
        name: `Campaign Stats ${Date.now()}`,
        channel: "sms",
        content: {
          text: "Campaign stats body",
          from: "ReachDem",
        },
      }),
    });

    const createRes = await createCampaignHandler(createReq, {
      params: Promise.resolve({}),
    });
    expect(createRes.status).toBe(201);
    const campaign = await createRes.json();
    testCampaignId = campaign.id;

    const audienceReq = new NextRequest(
      `http://localhost/api/v1/campaigns/${campaign.id}/audience`,
      {
        method: "POST",
        body: JSON.stringify({
          audiences: [
            { sourceType: "group", sourceId: testGroupId },
            { sourceType: "segment", sourceId: testSegmentId },
          ],
        }),
      }
    );
    const audienceRes = await setAudienceHandler(audienceReq, {
      params: Promise.resolve({ id: campaign.id }),
    });
    expect(audienceRes.status).toBe(201);

    const launchRes = await launchCampaignHandler(
      new NextRequest(
        `http://localhost/api/v1/campaigns/${campaign.id}/launch`,
        {
          method: "POST",
        }
      ),
      { params: Promise.resolve({ id: campaign.id }) }
    );
    expect(launchRes.status).toBe(200);

    const messages = await prisma.message.findMany({
      where: { campaignId: campaign.id },
      orderBy: { createdAt: "asc" },
    });
    expect(messages.length).toBeGreaterThan(0);

    await ProcessSmsMessageJobUseCase.execute(
      {
        message_id: messages[0].id,
        organization_id: REAL_ORG_ID,
        channel: "sms",
        delivery_cycle: 1,
      },
      {
        republish: async () => {
          throw new Error("Unexpected republish during campaign stats test");
        },
      }
    );

    if (messages[1]) {
      await prisma.message.update({
        where: { id: messages[1].id },
        data: {
          status: "failed",
          providerSelected: "stub",
        },
      });
      await prisma.campaignTarget.updateMany({
        where: { messageId: messages[1].id },
        data: { status: "failed" },
      });
    }

    await prisma.trackedLink.createMany({
      data: [
        {
          organizationId: REAL_ORG_ID,
          sinkLinkId: `sink_stats_${randomUUID()}`,
          slug: `stats-${Date.now()}-a`,
          shortUrl: "https://rcdm.ink/stats-a",
          targetUrl: "https://example.com/a",
          campaignId: campaign.id,
          messageId: messages[0].id,
          channel: "sms",
        },
        {
          organizationId: REAL_ORG_ID,
          sinkLinkId: `sink_stats_${randomUUID()}`,
          slug: `stats-${Date.now()}-b`,
          shortUrl: "https://rcdm.ink/stats-b",
          targetUrl: "https://example.com/b",
          campaignId: campaign.id,
          messageId: messages[0].id,
          channel: "sms",
        },
      ],
    });

    const res = await getCampaignStatsHandler(
      new NextRequest(
        `http://localhost/api/v1/campaigns/${campaign.id}/stats`,
        {
          method: "GET",
        }
      ),
      { params: Promise.resolve({ id: campaign.id }) }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.campaignId).toBe(campaign.id);
    expect(body.audienceSize).toBeGreaterThanOrEqual(2);
    expect(body.sentCount).toBe(1);
    expect(body.failedCount).toBe(1);
    expect(body.clickCount).toBe(24);
    expect(body.uniqueClickCount).toBe(18);
  }, 60_000);
});
