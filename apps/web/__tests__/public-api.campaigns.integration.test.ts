import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@reachdem/database";
import { ApiKeyService } from "@reachdem/core";
import {
  GET as listCampaignsHandler,
  POST as createCampaignHandler,
} from "../app/api/public/v1/campaigns/route";
import { GET as getCampaignHandler } from "../app/api/public/v1/campaigns/[id]/route";
import {
  GET as getAudienceHandler,
  POST as setAudienceHandler,
} from "../app/api/public/v1/campaigns/[id]/audience/route";
import { POST as launchCampaignHandler } from "../app/api/public/v1/campaigns/[id]/launch/route";

const REAL_ORG_ID = process.env.TEST_ORG_ID;

if (!REAL_ORG_ID) {
  throw new Error("Missing required test env var: TEST_ORG_ID");
}

async function withDbRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delayMs = 750
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1) break;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

describe("Public Campaigns API - integration", () => {
  const createdApiKeyIds: string[] = [];
  const createdCampaignIds: string[] = [];
  const queuedCampaignLaunchJobs: Array<{
    campaign_id: string;
    organization_id: string;
  }> = [];
  let testGroupId: string;
  let testContactId: string;
  let smsConfigCreated = false;

  beforeAll(async () => {
    const group = await withDbRetry(() =>
      prisma.group.create({
        data: {
          organizationId: REAL_ORG_ID,
          name: `Public Campaign Group ${Date.now()}`,
        },
      })
    );
    testGroupId = group.id;

    const contact = await withDbRetry(() =>
      prisma.contact.create({
        data: {
          organizationId: REAL_ORG_ID,
          phoneE164: "+237677777777",
          email: `public-campaign-${Date.now()}@example.com`,
          name: "Public Campaign Contact",
          hasValidNumber: true,
          hasEmailableAddress: true,
          memberships: {
            create: { groupId: testGroupId },
          },
        },
      })
    );
    testContactId = contact.id;

    const existing = await withDbRetry(() =>
      prisma.workspaceSmsConfig.findUnique({
        where: { organizationId: REAL_ORG_ID },
      })
    );
    if (!existing) {
      await withDbRetry(() =>
        prisma.workspaceSmsConfig.create({
          data: {
            organizationId: REAL_ORG_ID,
            primaryProvider: "stub",
            secondaryProviders: [],
          },
        })
      );
      smsConfigCreated = true;
    }

    await withDbRetry(() =>
      prisma.contact.update({
        where: { id: contact.id },
        data: { hasValidNumber: true, hasEmailableAddress: true },
      })
    );
  }, 90_000);

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.API_KEY_HASH_SECRET = "public-campaigns-test-secret";
    queuedCampaignLaunchJobs.splice(0);

    await withDbRetry(() =>
      prisma.organization.update({
        where: { id: REAL_ORG_ID },
        data: {
          planCode: "free",
          creditBalance: 5000,
          creditCurrency: "XAF",
          smsQuotaUsed: 0,
          emailQuotaUsed: 0,
          workspaceVerificationStatus: "verified",
          workspaceVerifiedAt: new Date(),
          senderId: "REACHDEM",
        },
      })
    );

    const workerBaseUrl =
      process.env.SMS_WORKER_BASE_URL ??
      process.env.CLOUDFLARE_WORKER_BASE_URL ??
      "http://127.0.0.1:8787";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === `${workerBaseUrl}/queue/campaign-launch`) {
          if (init?.body) {
            queuedCampaignLaunchJobs.push(
              JSON.parse(String(init.body)) as {
                campaign_id: string;
                organization_id: string;
              }
            );
          }
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      })
    );
  }, 30_000);

  afterAll(async () => {
    if (createdCampaignIds.length > 0) {
      await withDbRetry(() =>
        prisma.billingRecord.deleteMany({
          where: { campaignId: { in: createdCampaignIds } },
        })
      );
      await withDbRetry(() =>
        prisma.campaignTarget.deleteMany({
          where: { campaignId: { in: createdCampaignIds } },
        })
      );
      await withDbRetry(() =>
        prisma.campaignAudience.deleteMany({
          where: { campaignId: { in: createdCampaignIds } },
        })
      );
      await withDbRetry(() =>
        prisma.campaign.deleteMany({
          where: { id: { in: createdCampaignIds } },
        })
      );
    }
    if (createdApiKeyIds.length > 0) {
      await withDbRetry(() =>
        prisma.apiIdempotencyRecord.deleteMany({
          where: { apiKeyId: { in: createdApiKeyIds } },
        })
      );
      await withDbRetry(() =>
        prisma.apiKey.deleteMany({
          where: { id: { in: createdApiKeyIds } },
        })
      );
    }
    if (smsConfigCreated) {
      await withDbRetry(() =>
        prisma.workspaceSmsConfig.delete({
          where: { organizationId: REAL_ORG_ID },
        })
      );
    }
    if (testContactId) {
      await withDbRetry(() =>
        prisma.contact.delete({ where: { id: testContactId } })
      );
    }
    if (testGroupId) {
      await withDbRetry(() =>
        prisma.group.delete({ where: { id: testGroupId } })
      );
    }
  }, 60_000);

  async function createKey(scopes = ["campaigns:write", "campaigns:read"]) {
    const generated = ApiKeyService.generate("test");
    const apiKey = await prisma.apiKey.create({
      data: {
        organizationId: REAL_ORG_ID,
        name: `Public campaigns key ${Date.now()}`,
        keyPrefix: generated.keyPrefix,
        keyHash: generated.keyHash,
        environment: "test",
        scopes,
      },
    });
    createdApiKeyIds.push(apiKey.id);
    return { ...generated, apiKeyId: apiKey.id };
  }

  it("creates, reads and lists a public campaign", async () => {
    const key = await createKey();

    const createRes = await createCampaignHandler(
      new NextRequest("http://localhost/api/public/v1/campaigns", {
        method: "POST",
        body: JSON.stringify({
          name: "Public SMS Campaign",
          channel: "sms",
          content: {
            text: "Hello public campaign",
            from: "ReachDem",
          },
        }),
        headers: {
          authorization: `Bearer ${key.apiKey}`,
          "content-type": "application/json",
          "idempotency-key": `public-campaign-${Date.now()}`,
        },
      })
    );
    const created = await createRes.json();
    expect(createRes.status).toBe(201);
    createdCampaignIds.push(created.id);

    const campaignRow = await prisma.campaign.findUnique({
      where: { id: created.id },
    });
    expect(campaignRow?.apiKeyId).toBe(key.apiKeyId);

    const getRes = await getCampaignHandler(
      new NextRequest(
        `http://localhost/api/public/v1/campaigns/${created.id}`,
        {
          headers: { authorization: `Bearer ${key.apiKey}` },
        }
      ),
      { params: { id: created.id } }
    );
    expect(getRes.status).toBe(200);

    const listRes = await listCampaignsHandler(
      new NextRequest("http://localhost/api/public/v1/campaigns?limit=10", {
        headers: { authorization: `Bearer ${key.apiKey}` },
      })
    );
    const listBody = await listRes.json();
    expect(listRes.status).toBe(200);
    expect(
      listBody.items.some(
        (campaign: { id: string }) => campaign.id === created.id
      )
    ).toBe(true);
  }, 30_000);

  it("sets and fetches public campaign audience", async () => {
    const key = await createKey();
    const createRes = await createCampaignHandler(
      new NextRequest("http://localhost/api/public/v1/campaigns", {
        method: "POST",
        body: JSON.stringify({
          name: "Audience Campaign",
          channel: "sms",
          content: {
            text: "Audience test",
            from: "ReachDem",
          },
        }),
        headers: {
          authorization: `Bearer ${key.apiKey}`,
          "content-type": "application/json",
          "idempotency-key": `public-campaign-audience-${Date.now()}`,
        },
      })
    );
    const created = await createRes.json();
    createdCampaignIds.push(created.id);

    const setRes = await setAudienceHandler(
      new NextRequest(
        `http://localhost/api/public/v1/campaigns/${created.id}/audience`,
        {
          method: "POST",
          body: JSON.stringify({
            audiences: [{ sourceType: "group", sourceId: testGroupId }],
          }),
          headers: {
            authorization: `Bearer ${key.apiKey}`,
            "content-type": "application/json",
          },
        }
      ),
      { params: { id: created.id } }
    );
    const audienceBody = await setRes.json();
    expect(setRes.status).toBe(201);
    expect(audienceBody).toHaveLength(1);

    const getRes = await getAudienceHandler(
      new NextRequest(
        `http://localhost/api/public/v1/campaigns/${created.id}/audience`,
        {
          headers: { authorization: `Bearer ${key.apiKey}` },
        }
      ),
      { params: { id: created.id } }
    );
    const getBody = await getRes.json();
    expect(getRes.status).toBe(200);
    expect(getBody).toHaveLength(1);
  }, 30_000);

  it("launches a public campaign and bills the launch against the API key", async () => {
    const key = await createKey();
    const createRes = await createCampaignHandler(
      new NextRequest("http://localhost/api/public/v1/campaigns", {
        method: "POST",
        body: JSON.stringify({
          name: "Launch Campaign",
          channel: "sms",
          content: {
            text: "Launch me",
            from: "ReachDem",
          },
        }),
        headers: {
          authorization: `Bearer ${key.apiKey}`,
          "content-type": "application/json",
          "idempotency-key": `public-campaign-launch-create-${Date.now()}`,
        },
      })
    );
    const created = await createRes.json();
    createdCampaignIds.push(created.id);

    await setAudienceHandler(
      new NextRequest(
        `http://localhost/api/public/v1/campaigns/${created.id}/audience`,
        {
          method: "POST",
          body: JSON.stringify({
            audiences: [{ sourceType: "group", sourceId: testGroupId }],
          }),
          headers: {
            authorization: `Bearer ${key.apiKey}`,
            "content-type": "application/json",
          },
        }
      ),
      { params: { id: created.id } }
    );

    const launchRes = await launchCampaignHandler(
      new NextRequest(
        `http://localhost/api/public/v1/campaigns/${created.id}/launch`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${key.apiKey}`,
            "idempotency-key": `public-campaign-launch-${Date.now()}`,
          },
        }
      ),
      { params: { id: created.id } }
    );
    const launchBody = await launchRes.json();

    expect(launchRes.status).toBe(200);
    expect(launchBody.message).toContain("queued");
    expect(queuedCampaignLaunchJobs).toHaveLength(1);
    expect(queuedCampaignLaunchJobs[0].campaign_id).toBe(created.id);

    const billingRecord = await prisma.billingRecord.findFirst({
      where: { campaignId: created.id },
      orderBy: { createdAt: "desc" },
    });
    expect(billingRecord?.apiKeyId).toBe(key.apiKeyId);

    const updatedCampaign = await prisma.campaign.findUnique({
      where: { id: created.id },
    });
    expect(updatedCampaign?.status).toBe("running");
  }, 30_000);
});
