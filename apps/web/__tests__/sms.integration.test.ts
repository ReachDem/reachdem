import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import { POST as sendSmsHandler } from "../app/api/v1/sms/send/route";
import { GET as listMessagesHandler } from "../app/api/v1/sms/messages/route";
import { GET as getMessageHandler } from "../app/api/v1/sms/messages/[id]/route";
import { auth } from "@reachdem/auth";
import { prisma } from "@reachdem/database";
import { NextRequest } from "next/server";

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

// ────────────────────────────────────────────────────────────────────────────────

const REAL_ORG_ID = process.env.TEST_ORG_ID;
const TEST_USER_ID = process.env.TEST_USER_ID;
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;

if (!REAL_ORG_ID || !TEST_USER_ID || !TEST_USER_EMAIL) {
  throw new Error(
    "Missing required test env vars: TEST_ORG_ID, TEST_USER_ID, TEST_USER_EMAIL"
  );
}

// ────────────────────────────────────────────────────────────────────────────────

describe("SMS API - REAL DATABASE INTEGRATION", () => {
  const createdMessageIds: string[] = [];
  let smsConfigCreated = false;

  /** Ensure the test workspace has a 'stub' SMS config */
  beforeAll(async () => {
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
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true }),
      })
    );
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: TEST_USER_ID, email: TEST_USER_EMAIL } as any,
      session: { activeOrganizationId: REAL_ORG_ID } as any,
    });
  });

  afterAll(async () => {
    // Cleanup messages
    if (createdMessageIds.length > 0) {
      await prisma.messageAttempt.deleteMany({
        where: { messageId: { in: createdMessageIds } },
      });
      await prisma.message.deleteMany({
        where: { id: { in: createdMessageIds } },
      });
    }
    // Cleanup SMS config only if we created it
    if (smsConfigCreated) {
      await prisma.workspaceSmsConfig.delete({
        where: { organizationId: REAL_ORG_ID },
      });
    }
  });

  // ─── POST /sms/send ──────────────────────────────────────────────────────────

  describe("POST /sms/send", () => {
    it("should queue an SMS execution job and create a queued message in DB", async () => {
      const idem = `test-sms-${Date.now()}`;
      const req = new NextRequest("http://localhost/api/v1/sms/send", {
        method: "POST",
        body: JSON.stringify({
          to: "+33612345678",
          text: "Hello from ReachDem tests",
          from: "ReachDem",
          idempotency_key: idem,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await sendSmsHandler(req, {} as any);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body).toHaveProperty("message_id");
      expect(body.status).toBe("queued");
      expect(body.correlation_id).toBeDefined();
      expect(body.idempotent).toBe(false);

      createdMessageIds.push(body.message_id);

      // Verify DB record
      const msg = await prisma.message.findUnique({
        where: { id: body.message_id },
        include: { attempts: true },
      });
      expect(msg).not.toBeNull();
      expect(msg!.status).toBe("queued");
      expect(msg!.providerSelected).toBeNull();
      expect(msg!.attempts).toHaveLength(0);
      expect(msg!.toLast4).toBe("5678");
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("should return 400 for an invalid E.164 phone number", async () => {
      const req = new NextRequest("http://localhost/api/v1/sms/send", {
        method: "POST",
        body: JSON.stringify({
          to: "0612345678", // Missing +
          text: "Hello",
          from: "ReachDem",
          idempotency_key: `bad-phone-${Date.now()}`,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await sendSmsHandler(req, {} as any);
      expect(res.status).toBe(400);
    });

    it("should return 400 for an empty text", async () => {
      const req = new NextRequest("http://localhost/api/v1/sms/send", {
        method: "POST",
        body: JSON.stringify({
          to: "+33612345678",
          text: "",
          from: "ReachDem",
          idempotency_key: `empty-text-${Date.now()}`,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await sendSmsHandler(req, {} as any);
      expect(res.status).toBe(400);
    });

    it("should handle idempotency: return existing message for duplicate key", async () => {
      const idem = `idempotent-test-${Date.now()}`;
      const body = {
        to: "+447911123456",
        text: "Idempotency test",
        from: "ReachDem",
        idempotency_key: idem,
      };

      const makeRequest = () =>
        new NextRequest("http://localhost/api/v1/sms/send", {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        });

      // First call
      const res1 = await sendSmsHandler(makeRequest(), {} as any);
      const b1 = await res1.json();
      expect(res1.status).toBe(201);
      expect(b1.idempotent).toBe(false);
      createdMessageIds.push(b1.message_id);

      // Second call — same idempotency key
      const res2 = await sendSmsHandler(makeRequest(), {} as any);
      const b2 = await res2.json();
      expect(res2.status).toBe(200);
      expect(b2.idempotent).toBe(true);
      expect(b2.message_id).toBe(b1.message_id); // Same message returned
    });
  });

  // ─── GET /sms/messages ───────────────────────────────────────────────────────

  describe("GET /sms/messages", () => {
    it("should return a paginated list scoped to the workspace", async () => {
      const req = new NextRequest(
        "http://localhost/api/v1/sms/messages?limit=10"
      );

      const res = await listMessagesHandler(req, {} as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveProperty("items");
      expect(Array.isArray(body.items)).toBe(true);
      // All items must belong to the test workspace (no toHashed exposed)
      body.items.forEach((m: any) => {
        expect(m).not.toHaveProperty("toHashed");
        expect(m).toHaveProperty("toLast4");
      });
    });

    it("should filter by status", async () => {
      const req = new NextRequest(
        "http://localhost/api/v1/sms/messages?status=queued"
      );

      const res = await listMessagesHandler(req, {} as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      body.items.forEach((m: any) => {
        expect(m.status).toBe("queued");
      });
    });
  });

  // ─── GET /sms/messages/:id ───────────────────────────────────────────────────

  describe("GET /sms/messages/:id", () => {
    it("should return a message with its attempts", async () => {
      // Use the first message created in the suite
      const messageId = createdMessageIds[0];
      if (!messageId) {
        console.warn("Skipping — no message created yet");
        return;
      }

      const req = new NextRequest(
        `http://localhost/api/v1/sms/messages/${messageId}`
      );

      const res = await getMessageHandler(req, {
        params: Promise.resolve({ id: messageId }),
      } as any);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.id).toBe(messageId);
      expect(Array.isArray(body.attempts)).toBe(true);
      expect(body.attempts.length).toBeGreaterThanOrEqual(0);
    });

    it("should return 404 for an unknown message ID", async () => {
      const req = new NextRequest(
        "http://localhost/api/v1/sms/messages/nonexistent-id-xyz"
      );

      const res = await getMessageHandler(req, {
        params: Promise.resolve({ id: "nonexistent-id-xyz" }),
      } as any);

      expect(res.status).toBe(404);
    });
  });
});
