import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@reachdem/database";
import { ApiKeyService } from "@reachdem/core";
import { withApiKeyAuth } from "../lib/public-api/with-api-key-auth";

const REAL_ORG_ID = process.env.TEST_ORG_ID;

if (!REAL_ORG_ID) {
  throw new Error("Missing required test env var: TEST_ORG_ID");
}

describe("Public API foundation - integration", () => {
  const createdApiKeyIds: string[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.API_KEY_HASH_SECRET = "public-api-test-secret";

    if (createdApiKeyIds.length > 0) {
      await prisma.apiIdempotencyRecord.deleteMany({
        where: { apiKeyId: { in: createdApiKeyIds } },
      });
      await prisma.apiKey.deleteMany({
        where: { id: { in: createdApiKeyIds } },
      });
      createdApiKeyIds.splice(0);
    }
  });

  afterAll(async () => {
    if (createdApiKeyIds.length > 0) {
      await prisma.apiIdempotencyRecord.deleteMany({
        where: { apiKeyId: { in: createdApiKeyIds } },
      });
      await prisma.apiKey.deleteMany({
        where: { id: { in: createdApiKeyIds } },
      });
    }
  });

  async function createKey(scopes = ["messages:write"], revoked = false) {
    const generated = ApiKeyService.generate("test");
    const apiKey = await prisma.apiKey.create({
      data: {
        organizationId: REAL_ORG_ID,
        name: `Public API test key ${Date.now()}`,
        keyPrefix: generated.keyPrefix,
        keyHash: generated.keyHash,
        environment: "test",
        scopes,
        revokedAt: revoked ? new Date() : null,
      },
    });
    createdApiKeyIds.push(apiKey.id);
    return { ...generated, apiKeyId: apiKey.id };
  }

  it("authenticates a valid API key and injects organization context", async () => {
    const key = await createKey(["messages:write"]);
    const handler = withApiKeyAuth(
      async ({ context }) =>
        NextResponse.json({
          organizationId: context.organizationId,
          apiKeyId: context.apiKeyId,
          keyPrefix: context.keyPrefix,
          requestId: context.requestId,
        }),
      { requiredScopes: ["messages:write"] }
    );

    const req = new NextRequest("http://localhost/api/public/v1/probe", {
      headers: {
        authorization: `Bearer ${key.apiKey}`,
        "x-request-id": "req_public_api_auth",
      },
    });

    const res = await handler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.organizationId).toBe(REAL_ORG_ID);
    expect(body.apiKeyId).toBe(key.apiKeyId);
    expect(body.keyPrefix).toBe(key.keyPrefix);
    expect(body.requestId).toBe("req_public_api_auth");
  });

  it("rejects a missing API key with the standard public error format", async () => {
    const handler = withApiKeyAuth(
      async () => NextResponse.json({ ok: true }),
      { requiredScopes: ["messages:write"] }
    );

    const res = await handler(
      new NextRequest("http://localhost/api/public/v1/probe")
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
    expect(body.error.message).toBe("Missing bearer API key");
    expect(body.request_id).toBeTruthy();
  });

  it("rejects revoked API keys immediately", async () => {
    const key = await createKey(["messages:write"], true);
    const handler = withApiKeyAuth(
      async () => NextResponse.json({ ok: true }),
      { requiredScopes: ["messages:write"] }
    );

    const res = await handler(
      new NextRequest("http://localhost/api/public/v1/probe", {
        headers: { authorization: `Bearer ${key.apiKey}` },
      })
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("api_key_revoked");
  });

  it("enforces required scopes", async () => {
    const key = await createKey(["messages:read"]);
    const handler = withApiKeyAuth(
      async () => NextResponse.json({ ok: true }),
      { requiredScopes: ["messages:write"] }
    );

    const res = await handler(
      new NextRequest("http://localhost/api/public/v1/probe", {
        headers: { authorization: `Bearer ${key.apiKey}` },
      })
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("insufficient_scope");
    expect(body.error.details.missingScopes).toEqual(["messages:write"]);
  });

  it("replays stored idempotent responses without reprocessing", async () => {
    const key = await createKey(["messages:write"]);
    let executionCount = 0;
    const handler = withApiKeyAuth(
      async ({ req }) => {
        executionCount += 1;
        const body = await req.json();
        return NextResponse.json(
          { accepted: true, executionCount, body },
          { status: 201 }
        );
      },
      {
        requiredScopes: ["messages:write"],
        idempotency: { enabled: true, ttlSeconds: 3600 },
      }
    );

    const makeRequest = () =>
      new NextRequest("http://localhost/api/public/v1/messages/sms", {
        method: "POST",
        body: JSON.stringify({ to: "+237600000000", text: "Hello" }),
        headers: {
          authorization: `Bearer ${key.apiKey}`,
          "content-type": "application/json",
          "idempotency-key": "idem_replay_test",
        },
      });

    const first = await handler(makeRequest());
    const second = await handler(makeRequest());
    const firstBody = await first.json();
    const secondBody = await second.json();

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(executionCount).toBe(1);
    expect(secondBody).toEqual(firstBody);
  });

  it("returns 409 when an idempotency key is reused with another payload", async () => {
    const key = await createKey(["messages:write"]);
    const handler = withApiKeyAuth(
      async ({ req }) =>
        NextResponse.json(
          { accepted: true, body: await req.json() },
          { status: 201 }
        ),
      {
        requiredScopes: ["messages:write"],
        idempotency: { enabled: true, ttlSeconds: 3600 },
      }
    );

    const first = await handler(
      new NextRequest("http://localhost/api/public/v1/messages/sms", {
        method: "POST",
        body: JSON.stringify({ to: "+237600000000", text: "Hello" }),
        headers: {
          authorization: `Bearer ${key.apiKey}`,
          "content-type": "application/json",
          "idempotency-key": "idem_conflict_test",
        },
      })
    );
    expect(first.status).toBe(201);

    const conflict = await handler(
      new NextRequest("http://localhost/api/public/v1/messages/sms", {
        method: "POST",
        body: JSON.stringify({ to: "+237600000000", text: "Different" }),
        headers: {
          authorization: `Bearer ${key.apiKey}`,
          "content-type": "application/json",
          "idempotency-key": "idem_conflict_test",
        },
      })
    );
    const body = await conflict.json();

    expect(conflict.status).toBe(409);
    expect(body.error.code).toBe("idempotency_conflict");
  });
});
