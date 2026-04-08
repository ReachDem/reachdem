import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@reachdem/database";
import { ApiKeyService } from "@reachdem/core";
import {
  GET as listWebhookSubscriptionsHandler,
  POST as createWebhookSubscriptionHandler,
} from "../app/api/public/v1/webhook-subscriptions/route";
import {
  PATCH as updateWebhookSubscriptionHandler,
  DELETE as deleteWebhookSubscriptionHandler,
} from "../app/api/public/v1/webhook-subscriptions/[id]/route";

const REAL_ORG_ID = process.env.TEST_ORG_ID;

if (!REAL_ORG_ID) {
  throw new Error("Missing required test env var: TEST_ORG_ID");
}

describe("Public Webhook Subscriptions API - integration", () => {
  const createdApiKeyIds: string[] = [];
  const createdSubscriptionIds: string[] = [];

  beforeEach(() => {
    process.env.API_KEY_HASH_SECRET = "public-webhooks-test-secret";
  });

  afterAll(async () => {
    if (createdSubscriptionIds.length > 0) {
      await prisma.apiWebhookSubscription.deleteMany({
        where: { id: { in: createdSubscriptionIds } },
      });
    }
    if (createdApiKeyIds.length > 0) {
      await prisma.apiKey.deleteMany({
        where: { id: { in: createdApiKeyIds } },
      });
    }
  });

  async function createKey(scopes = ["webhooks:write", "webhooks:read"]) {
    const generated = ApiKeyService.generate("test");
    const apiKey = await prisma.apiKey.create({
      data: {
        organizationId: REAL_ORG_ID,
        name: `Webhook subscriptions key ${Date.now()}`,
        keyPrefix: generated.keyPrefix,
        keyHash: generated.keyHash,
        environment: "test",
        scopes,
      },
    });
    createdApiKeyIds.push(apiKey.id);
    return { ...generated, apiKeyId: apiKey.id };
  }

  it("creates, lists, rotates and deletes webhook subscriptions", async () => {
    const key = await createKey();

    const createRes = await createWebhookSubscriptionHandler(
      new NextRequest("http://localhost/api/public/v1/webhook-subscriptions", {
        method: "POST",
        body: JSON.stringify({
          targetUrl: "https://example.test/webhooks/reachdem",
          eventTypes: ["message.sent", "message.failed"],
        }),
        headers: {
          authorization: `Bearer ${key.apiKey}`,
          "content-type": "application/json",
        },
      })
    );
    const created = await createRes.json();

    expect(createRes.status).toBe(201);
    expect(created.signingSecret).toBeTruthy();
    expect(created.hasSigningSecret).toBe(true);
    createdSubscriptionIds.push(created.id);

    const listRes = await listWebhookSubscriptionsHandler(
      new NextRequest("http://localhost/api/public/v1/webhook-subscriptions", {
        headers: {
          authorization: `Bearer ${key.apiKey}`,
        },
      })
    );
    const listed = await listRes.json();

    expect(listRes.status).toBe(200);
    expect(listed.items).toHaveLength(1);
    expect(listed.items[0].signingSecret).toBeUndefined();
    expect(listed.items[0].eventTypes).toEqual([
      "message.sent",
      "message.failed",
    ]);

    const patchRes = await updateWebhookSubscriptionHandler(
      new NextRequest(
        `http://localhost/api/public/v1/webhook-subscriptions/${created.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            active: false,
            rotateSigningSecret: true,
            eventTypes: ["*"],
          }),
          headers: {
            authorization: `Bearer ${key.apiKey}`,
            "content-type": "application/json",
          },
        }
      ),
      { params: { id: created.id } }
    );
    const patched = await patchRes.json();

    expect(patchRes.status).toBe(200);
    expect(patched.active).toBe(false);
    expect(patched.eventTypes).toEqual(["*"]);
    expect(patched.signingSecret).toBeTruthy();
    expect(patched.signingSecret).not.toBe(created.signingSecret);

    const deleteRes = await deleteWebhookSubscriptionHandler(
      new NextRequest(
        `http://localhost/api/public/v1/webhook-subscriptions/${created.id}`,
        {
          method: "DELETE",
          headers: {
            authorization: `Bearer ${key.apiKey}`,
          },
        }
      ),
      { params: { id: created.id } }
    );

    expect(deleteRes.status).toBe(204);
    createdSubscriptionIds.splice(
      createdSubscriptionIds.indexOf(created.id),
      1
    );

    const deleted = await prisma.apiWebhookSubscription.findUnique({
      where: { id: created.id },
    });
    expect(deleted).toBeNull();
  }, 60_000);
});
