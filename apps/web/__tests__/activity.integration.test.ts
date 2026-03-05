import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@reachdem/database";

// Route handlers
import { GET as listActivity } from "../app/api/v1/activity/route";
import { GET as getActivityById } from "../app/api/v1/activity/[id]/route";
import { POST as ingestActivity } from "../app/api/internal/activity/route";

// ─── Config ────────────────────────────────────────────────────────────────────

const REAL_ORG_ID = process.env.TEST_ORG_ID ?? "";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? "test-secret-local";

// Track created events for cleanup
const createdEventIds: string[] = [];

beforeAll(() => {
  if (!REAL_ORG_ID) {
    throw new Error("Missing required test environment variables: TEST_ORG_ID");
  }
  // Override secret for test env if not set
  process.env.INTERNAL_API_SECRET = INTERNAL_SECRET;
});

afterAll(async () => {
  await prisma.activityEvent.deleteMany({
    where: { id: { in: createdEventIds } },
  });
});

// ─── Auth mock (same pattern as other integration tests) ─────────────────────

vi.mock("@reachdem/auth/guards", () => ({
  withWorkspace: (handler: Function) => async (req: any, ctx: any) => {
    return handler({
      req,
      organizationId: REAL_ORG_ID,
      params: ctx?.params ? await ctx.params : {},
    });
  },
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Activity Logs API - REAL DATABASE INTEGRATION", () => {
  let testEventId: string;

  it("should create an event via POST /internal/activity", async () => {
    const req = new NextRequest("http://localhost:3000/api/internal/activity", {
      method: "POST",
      headers: {
        "x-internal-secret": INTERNAL_SECRET,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        organizationId: REAL_ORG_ID,
        category: "sms",
        action: "send_attempt",
        status: "pending",
        severity: "info",
        provider: "twilio",
        meta: { to: "+33612345678", body: "Hello", sid: "SMtest" },
      }),
    });

    const resp = await ingestActivity(req);
    expect(resp.status).toBe(201);
    const data = await resp.json();
    expect(data.id).toBeTruthy();
    expect(data.correlationId).toBeTruthy();

    testEventId = data.id;
    createdEventIds.push(testEventId);
  });

  it("should reject POST /internal/activity with wrong secret", async () => {
    const req = new NextRequest("http://localhost:3000/api/internal/activity", {
      method: "POST",
      headers: {
        "x-internal-secret": "wrong-secret",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category: "sms",
        action: "send_attempt",
        status: "pending",
        organizationId: REAL_ORG_ID,
      }),
    });

    const resp = await ingestActivity(req);
    expect(resp.status).toBe(401);
  });

  it("should list events via GET /activity", async () => {
    const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const to = new Date().toISOString();

    const req = new NextRequest(
      `http://localhost:3000/api/v1/activity?from=${from}&to=${to}&limit=10`
    );
    const resp = await listActivity(req as any, {
      params: Promise.resolve({}),
    });

    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(Array.isArray(data.items)).toBe(true);
  });

  it("should filter events by provider", async () => {
    const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const to = new Date().toISOString();

    const req = new NextRequest(
      `http://localhost:3000/api/v1/activity?from=${from}&to=${to}&provider=twilio`
    );
    const resp = await listActivity(req as any, {
      params: Promise.resolve({}),
    });

    expect(resp.status).toBe(200);
    const data = await resp.json();
    // All returned events should have provider = twilio
    for (const item of data.items) {
      expect(item.provider).toBe("twilio");
    }
  });

  it("should get a single event by ID via GET /activity/:id", async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/v1/activity/${testEventId}`
    );
    const resp = await getActivityById(req as any, {
      params: Promise.resolve({ id: testEventId }),
    });

    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data.id).toBe(testEventId);
  });

  it("should return 404 for an event from another workspace", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const req = new NextRequest(
      `http://localhost:3000/api/v1/activity/${fakeId}`
    );
    const resp = await getActivityById(req as any, {
      params: Promise.resolve({ id: fakeId }),
    });
    expect(resp.status).toBe(404);
  });

  it("should store and retrieve event with meta field", async () => {
    const event = await prisma.activityEvent.findUnique({
      where: { id: testEventId },
    });
    const meta = event?.meta as Record<string, any>;

    // The internal route stores raw meta as-is (scrubbing is the caller's responsibility),
    // but for this test we confirm the field is queryable
    expect(event).not.toBeNull();
    expect(meta).toBeTruthy();
  });

  it("should reject GET /activity with a window exceeding 30 days", async () => {
    const from = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date().toISOString();

    const req = new NextRequest(
      `http://localhost:3000/api/v1/activity?from=${from}&to=${to}`
    );
    const resp = await listActivity(req as any, {
      params: Promise.resolve({}),
    });
    expect(resp.status).toBe(400);
  });
});
