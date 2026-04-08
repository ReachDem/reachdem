import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@reachdem/database";
import { ApiKeyService } from "@reachdem/core";
import { POST as sendPublicSmsHandler } from "../app/api/public/v1/messages/sms/route";
import { POST as sendPublicEmailHandler } from "../app/api/public/v1/messages/email/route";
import { GET as listPublicMessagesHandler } from "../app/api/public/v1/messages/route";
import { GET as getPublicMessageHandler } from "../app/api/public/v1/messages/[id]/route";

const REAL_ORG_ID = process.env.TEST_ORG_ID;

if (!REAL_ORG_ID) {
  throw new Error("Missing required test env var: TEST_ORG_ID");
}

describe("Public Messages API - integration", () => {
  const createdApiKeyIds: string[] = [];
  const createdMessageIds: string[] = [];
  const createdWebhookSubscriptionIds: string[] = [];
  const recordedMessageIds = () =>
    createdMessageIds.filter((value): value is string => Boolean(value));

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.API_KEY_HASH_SECRET = "public-messages-test-secret";

    await prisma.organization.update({
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
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(""),
        json: vi.fn().mockResolvedValue({ success: true }),
      })
    );
  }, 30_000);

  afterAll(async () => {
    if (recordedMessageIds().length > 0) {
      await prisma.billingRecord.deleteMany({
        where: { messageId: { in: recordedMessageIds() } },
      });
    }
    if (createdApiKeyIds.length > 0) {
      await prisma.webhookDelivery.deleteMany({
        where: { apiKeyId: { in: createdApiKeyIds } },
      });
    }
    if (createdWebhookSubscriptionIds.length > 0) {
      await prisma.apiWebhookSubscription.deleteMany({
        where: { id: { in: createdWebhookSubscriptionIds } },
      });
    }
    if (createdApiKeyIds.length > 0) {
      await prisma.apiIdempotencyRecord.deleteMany({
        where: { apiKeyId: { in: createdApiKeyIds } },
      });
      await prisma.apiKey.deleteMany({
        where: { id: { in: createdApiKeyIds } },
      });
    }
    if (recordedMessageIds().length > 0) {
      await prisma.message.deleteMany({
        where: { id: { in: recordedMessageIds() } },
      });
    }
  }, 30_000);

  async function createKey(scopes = ["messages:write", "messages:read"]) {
    const generated = ApiKeyService.generate("test");
    const apiKey = await prisma.apiKey.create({
      data: {
        organizationId: REAL_ORG_ID,
        name: `Public messages key ${Date.now()}`,
        keyPrefix: generated.keyPrefix,
        keyHash: generated.keyHash,
        environment: "test",
        scopes,
      },
    });
    createdApiKeyIds.push(apiKey.id);
    return { ...generated, apiKeyId: apiKey.id };
  }

  it("creates a public SMS message, stores apiKeyId and enqueues subscription webhooks", async () => {
    const key = await createKey();
    const subscription = await prisma.apiWebhookSubscription.create({
      data: {
        organizationId: REAL_ORG_ID,
        apiKeyId: key.apiKeyId,
        targetUrl: "https://example.test/webhooks/messages",
        eventTypes: ["message.accepted"],
        active: true,
        signingSecret: "webhook-secret",
      },
    });
    createdWebhookSubscriptionIds.push(subscription.id);

    const req = new NextRequest("http://localhost/api/public/v1/messages/sms", {
      method: "POST",
      body: JSON.stringify({
        to: "+237699999999",
        text: "Public API SMS",
        from: "ReachDem",
      }),
      headers: {
        authorization: `Bearer ${key.apiKey}`,
        "content-type": "application/json",
        "idempotency-key": `public-sms-${Date.now()}`,
      },
    });

    const res = await sendPublicSmsHandler(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.status).toBe("queued");
    createdMessageIds.push(body.message_id);

    const message = await prisma.message.findUnique({
      where: { id: body.message_id },
    });
    expect(message?.apiKeyId).toBe(key.apiKeyId);
    expect(message?.from).toBe("REACHDEM");

    const billingRecord = await prisma.billingRecord.findFirst({
      where: { messageId: body.message_id },
      orderBy: { createdAt: "desc" },
    });
    expect(billingRecord?.apiKeyId).toBe(key.apiKeyId);

    const queuedWebhook = await prisma.webhookDelivery.findFirst({
      where: {
        organizationId: REAL_ORG_ID,
        apiKeyId: key.apiKeyId,
        eventType: "message.accepted",
      },
      orderBy: { createdAt: "desc" },
    });
    expect(queuedWebhook?.targetUrl).toBe(subscription.targetUrl);
    expect(queuedWebhook?.signingSecret).toBe("webhook-secret");
  }, 30_000);

  it("creates a public email message and keeps billing tied to the API key", async () => {
    const key = await createKey();

    const req = new NextRequest(
      "http://localhost/api/public/v1/messages/email",
      {
        method: "POST",
        body: JSON.stringify({
          to: "public@example.com",
          subject: "Public API email",
          html: "<p>Hello from public API</p>",
          from: "ReachDem",
        }),
        headers: {
          authorization: `Bearer ${key.apiKey}`,
          "content-type": "application/json",
          "idempotency-key": `public-email-${Date.now()}`,
        },
      }
    );

    const res = await sendPublicEmailHandler(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.status).toBe("queued");
    createdMessageIds.push(body.message_id);

    const message = await prisma.message.findUnique({
      where: { id: body.message_id },
    });
    expect(message?.apiKeyId).toBe(key.apiKeyId);
    expect(message?.channel).toBe("email");

    const billingRecord = await prisma.billingRecord.findFirst({
      where: { messageId: body.message_id },
      orderBy: { createdAt: "desc" },
    });
    expect(billingRecord?.apiKeyId).toBe(key.apiKeyId);
    expect(billingRecord?.channel).toBe("email");
  }, 30_000);

  it("lists and fetches public API messages within the key organization", async () => {
    const key = await createKey();

    const createReq = new NextRequest(
      "http://localhost/api/public/v1/messages/email",
      {
        method: "POST",
        body: JSON.stringify({
          to: "lookup@example.com",
          subject: "Lookup me",
          html: "<p>Lookup</p>",
          from: "ReachDem",
        }),
        headers: {
          authorization: `Bearer ${key.apiKey}`,
          "content-type": "application/json",
          "idempotency-key": `public-email-lookup-${Date.now()}`,
        },
      }
    );

    const createRes = await sendPublicEmailHandler(createReq);
    const created = await createRes.json();
    createdMessageIds.push(created.message_id);

    const listRes = await listPublicMessagesHandler(
      new NextRequest("http://localhost/api/public/v1/messages?limit=10", {
        headers: {
          authorization: `Bearer ${key.apiKey}`,
        },
      })
    );
    const listBody = await listRes.json();

    expect(listRes.status).toBe(200);
    expect(
      listBody.items.some(
        (message: { id: string }) => message.id === created.message_id
      )
    ).toBe(true);

    const getRes = await getPublicMessageHandler(
      new NextRequest(
        `http://localhost/api/public/v1/messages/${created.message_id}`,
        {
          headers: {
            authorization: `Bearer ${key.apiKey}`,
          },
        }
      ),
      { params: { id: created.message_id } }
    );
    const getBody = await getRes.json();

    expect(getRes.status).toBe(200);
    expect(getBody.id).toBe(created.message_id);
    expect(getBody.organizationId).toBe(REAL_ORG_ID);
  }, 30_000);
});
