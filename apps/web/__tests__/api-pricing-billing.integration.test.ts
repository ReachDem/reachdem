import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createHash } from "crypto";
import { prisma } from "@reachdem/database";
import {
  ApiKeyService,
  ApiPricingService,
  BillingInsufficientCreditsError,
  BillingRecordService,
  MessageEventService,
  WebhookDeliveryService,
} from "@reachdem/core";

const REAL_ORG_ID = process.env.TEST_ORG_ID;

if (!REAL_ORG_ID) {
  throw new Error("Missing required test env var: TEST_ORG_ID");
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function withDbRetry<T>(
  operation: () => Promise<T>,
  attempts = 5
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }

  throw lastError;
}

describe("API pricing and billing foundation - integration", () => {
  const createdApiKeyIds: string[] = [];
  const createdPricingProfileIds: string[] = [];
  const createdWebhookSubscriptionIds: string[] = [];
  const createdMessageIds: string[] = [];
  let originalCreditBalance = 0;
  let originalCreditCurrency = "XAF";

  beforeAll(async () => {
    const organization = await withDbRetry(() =>
      prisma.organization.findUniqueOrThrow({
        where: { id: REAL_ORG_ID },
        select: { creditBalance: true, creditCurrency: true },
      })
    );
    originalCreditBalance = organization.creditBalance;
    originalCreditCurrency = organization.creditCurrency;
  }, 120_000);

  beforeEach(async () => {
    process.env.API_KEY_HASH_SECRET = "api-pricing-test-secret";
    process.env.API_DEFAULT_PRICING_PROFILE_NAME = "Default API Pricing Test";
    process.env.API_DEFAULT_PRICING_CURRENCY = "XAF";
    process.env.API_DEFAULT_SMS_TIERS_JSON =
      '[{"minimumQuantity":1,"unitAmountMinor":25},{"minimumQuantity":5001,"unitAmountMinor":22}]';
    process.env.API_DEFAULT_EMAIL_TIERS_JSON =
      '[{"minimumQuantity":1,"unitAmountMinor":7},{"minimumQuantity":10001,"unitAmountMinor":5}]';

    await cleanupCreatedRows();
    await withDbRetry(() =>
      prisma.organization.update({
        where: { id: REAL_ORG_ID },
        data: {
          creditBalance: originalCreditBalance,
          creditCurrency: originalCreditCurrency,
        },
      })
    );
  });

  afterAll(async () => {
    await cleanupCreatedRows();
    await withDbRetry(() =>
      prisma.organization.update({
        where: { id: REAL_ORG_ID },
        data: {
          creditBalance: originalCreditBalance,
          creditCurrency: originalCreditCurrency,
        },
      })
    );
  }, 120_000);

  async function cleanupCreatedRows() {
    await withDbRetry(() =>
      prisma.webhookDelivery.deleteMany({
        where: {
          organizationId: REAL_ORG_ID,
          eventType: { startsWith: "test." },
        },
      })
    );
    if (createdMessageIds.length > 0) {
      await withDbRetry(() =>
        prisma.messageEvent.deleteMany({
          where: { messageId: { in: createdMessageIds } },
        })
      );
      await withDbRetry(() =>
        prisma.billingRecord.deleteMany({
          where: { messageId: { in: createdMessageIds } },
        })
      );
      await withDbRetry(() =>
        prisma.message.deleteMany({
          where: { id: { in: createdMessageIds } },
        })
      );
      createdMessageIds.splice(0);
    }
    if (createdApiKeyIds.length > 0) {
      await withDbRetry(() =>
        prisma.apiWebhookSubscription.deleteMany({
          where: { id: { in: createdWebhookSubscriptionIds } },
        })
      );
      createdWebhookSubscriptionIds.splice(0);
      await withDbRetry(() =>
        prisma.billingRecord.deleteMany({
          where: { apiKeyId: { in: createdApiKeyIds } },
        })
      );
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
      createdApiKeyIds.splice(0);
    }
    if (createdPricingProfileIds.length > 0) {
      await withDbRetry(() =>
        prisma.billingRecord.deleteMany({
          where: { pricingProfileId: { in: createdPricingProfileIds } },
        })
      );
      await withDbRetry(() =>
        prisma.apiPricingProfile.deleteMany({
          where: { id: { in: createdPricingProfileIds } },
        })
      );
      createdPricingProfileIds.splice(0);
    }
  }

  async function createPricingProfile(input?: {
    smsUnitAmountMinor?: number;
    emailUnitAmountMinor?: number;
  }) {
    const profile = await prisma.apiPricingProfile.create({
      data: {
        name: `Test API Pricing ${Date.now()}`,
        currency: "XAF",
        active: true,
        isDefault: false,
        smsTiers: [
          {
            minimumQuantity: 1,
            unitAmountMinor: input?.smsUnitAmountMinor ?? 19,
          },
        ],
        emailTiers: [
          {
            minimumQuantity: 1,
            unitAmountMinor: input?.emailUnitAmountMinor ?? 4,
          },
        ],
      },
    });
    createdPricingProfileIds.push(profile.id);
    return profile;
  }

  async function createApiKey(pricingProfileId?: string | null) {
    const generated = ApiKeyService.generate("test");
    const apiKey = await prisma.apiKey.create({
      data: {
        organizationId: REAL_ORG_ID,
        name: `Billing foundation test key ${Date.now()}`,
        keyPrefix: generated.keyPrefix,
        keyHash: generated.keyHash,
        environment: "test",
        scopes: ["messages:write"],
        pricingProfileId: pricingProfileId ?? null,
      },
    });
    createdApiKeyIds.push(apiKey.id);
    return apiKey;
  }

  async function createWebhookSubscription(
    apiKeyId: string,
    eventTypes: string[]
  ) {
    const subscription = await withDbRetry(() =>
      prisma.apiWebhookSubscription.create({
        data: {
          organizationId: REAL_ORG_ID,
          apiKeyId,
          targetUrl: `https://example.test/webhooks/${Date.now()}`,
          eventTypes,
          active: true,
          signingSecret: "webhook-signing-secret",
        },
      })
    );
    createdWebhookSubscriptionIds.push(subscription.id);
    return subscription;
  }

  async function createMessage() {
    const to = "+237600000000";
    const message = await prisma.message.create({
      data: {
        organizationId: REAL_ORG_ID,
        channel: "sms",
        toE164: to,
        toHashed: hash(to),
        toLast4: "0000",
        from: "ReachDem",
        text: "Billing foundation test",
        status: "queued",
        idempotencyKey: `billing-foundation-${Date.now()}`,
      },
    });
    createdMessageIds.push(message.id);
    return message;
  }

  it("resolves the default API pricing profile from DB after env bootstrap", async () => {
    await ApiPricingService.upsertDefaultFromEnv();

    const price = await ApiPricingService.resolveMessagePrice(prisma, {
      channel: "sms",
      units: 10,
    });

    expect(price.currency).toBe("XAF");
    expect(price.unitPriceMinor).toBe(25);
    expect(price.totalPriceMinor).toBe(250);
  });

  it("resolves an API key pricing override before falling back to default", async () => {
    await ApiPricingService.upsertDefaultFromEnv();
    const profile = await createPricingProfile({ smsUnitAmountMinor: 17 });
    const apiKey = await createApiKey(profile.id);

    const price = await ApiPricingService.resolveMessagePrice(prisma, {
      apiKeyId: apiKey.id,
      channel: "sms",
      units: 3,
    });

    expect(price.pricingProfileId).toBe(profile.id);
    expect(price.unitPriceMinor).toBe(17);
    expect(price.totalPriceMinor).toBe(51);
  });

  it("debits the organization wallet and snapshots a billing record", async () => {
    const profile = await createPricingProfile({ smsUnitAmountMinor: 20 });
    const apiKey = await createApiKey(profile.id);
    const message = await createMessage();

    await prisma.organization.update({
      where: { id: REAL_ORG_ID },
      data: { creditBalance: 1000, creditCurrency: "XAF" },
    });

    const record = await BillingRecordService.billMessageUsage(prisma, {
      organizationId: REAL_ORG_ID,
      apiKeyId: apiKey.id,
      channel: "sms",
      units: 2,
      messageId: message.id,
      source: "publicApi",
    });
    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: REAL_ORG_ID },
      select: { creditBalance: true },
    });

    expect(record.unitPriceMinor).toBe(20);
    expect(record.totalPriceMinor).toBe(40);
    expect(record.currency).toBe("XAF");
    expect(record.walletCurrency).toBe("XAF");
    expect(record.apiKeyId).toBe(apiKey.id);
    expect(organization.creditBalance).toBe(960);
  });

  it("rejects billing when the wallet balance is insufficient", async () => {
    const profile = await createPricingProfile({ emailUnitAmountMinor: 7 });
    const apiKey = await createApiKey(profile.id);

    await prisma.organization.update({
      where: { id: REAL_ORG_ID },
      data: { creditBalance: 3, creditCurrency: "XAF" },
    });

    await expect(
      BillingRecordService.billMessageUsage(prisma, {
        organizationId: REAL_ORG_ID,
        apiKeyId: apiKey.id,
        channel: "email",
        units: 1,
        source: "publicApi",
      })
    ).rejects.toBeInstanceOf(BillingInsufficientCreditsError);
  });

  it("records message events", async () => {
    const message = await createMessage();

    const event = await MessageEventService.record(prisma, {
      organizationId: REAL_ORG_ID,
      messageId: message.id,
      type: "message.accepted",
      status: "queued",
      payload: { source: "test" },
    });

    expect(event.type).toBe("message.accepted");
    expect(event.status).toBe("queued");
  });

  it("records a message event and enqueues webhook deliveries when targets are provided", async () => {
    const message = await createMessage();

    const event = await MessageEventService.recordWithWebhookDelivery(prisma, {
      organizationId: REAL_ORG_ID,
      messageId: message.id,
      type: "message.sent",
      status: "sent",
      payload: { source: "test-webhook" },
      webhookTargetUrls: ["https://example.test/webhooks/message-events"],
    });

    const deliveries = await prisma.webhookDelivery.findMany({
      where: {
        organizationId: REAL_ORG_ID,
        eventType: "message.sent",
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    expect(event.type).toBe("message.sent");
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]?.targetUrl).toBe(
      "https://example.test/webhooks/message-events"
    );
  });

  it("resolves webhook subscriptions automatically from the API key", async () => {
    const message = await createMessage();
    const apiKey = await createApiKey();
    const subscription = await createWebhookSubscription(apiKey.id, [
      "message.sent",
    ]);

    await MessageEventService.recordWithWebhookDelivery(prisma, {
      organizationId: REAL_ORG_ID,
      apiKeyId: apiKey.id,
      messageId: message.id,
      type: "message.sent",
      status: "sent",
      payload: { source: "subscription" },
    });

    const delivery = await prisma.webhookDelivery.findFirst({
      where: {
        organizationId: REAL_ORG_ID,
        apiKeyId: apiKey.id,
        targetUrl: subscription.targetUrl,
        eventType: "message.sent",
      },
      orderBy: { createdAt: "desc" },
    });

    expect(delivery).not.toBeNull();
    expect(delivery?.signingSecret).toBe("webhook-signing-secret");
  });

  it("enqueues webhook deliveries for later retry processing", async () => {
    const delivery = await WebhookDeliveryService.enqueue(prisma, {
      organizationId: REAL_ORG_ID,
      eventType: "test.message.accepted",
      targetUrl: "https://example.test/webhooks/reachdem",
      payload: { messageId: "msg_test" },
    });

    expect(delivery.status).toBe("pending");
    expect(delivery.attemptCount).toBe(0);
    expect(delivery.nextAttemptAt).toBeTruthy();
  });

  it("claims pending webhook deliveries and schedules retry backoff", async () => {
    const delivery = await WebhookDeliveryService.enqueue(prisma, {
      organizationId: REAL_ORG_ID,
      eventType: "test.message.failed",
      targetUrl: "https://example.test/webhooks/reachdem",
      payload: { messageId: "msg_retry" },
    });

    const claimed = await WebhookDeliveryService.claimPendingBatch(prisma, {
      limit: 10,
    });
    const claimedDelivery = claimed.find((item) => item.id === delivery.id);

    expect(claimedDelivery?.status).toBe("delivering");
    expect(claimedDelivery?.attemptCount).toBe(1);

    const nextAttemptAt = WebhookDeliveryService.getNextAttemptAt(1);
    const failed = await WebhookDeliveryService.markFailed(prisma, {
      id: delivery.id,
      error: "temporary upstream failure",
      statusCode: 502,
      nextAttemptAt,
    });

    expect(failed.status).toBe("failed");
    expect(failed.lastStatusCode).toBe(502);
    expect(failed.nextAttemptAt?.getTime()).toBe(nextAttemptAt.getTime());
  });
});
