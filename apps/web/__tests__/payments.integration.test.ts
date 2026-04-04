import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { NextRequest } from "next/server";
import { createHmac, randomUUID } from "crypto";
import { prisma } from "@reachdem/database";
import { POST as createPaymentSessionHandler } from "../app/api/v1/payments/session/route";
import { GET as getPaymentSessionHandler } from "../app/api/v1/payments/session/[id]/route";
import { POST as reconcilePaymentSessionHandler } from "../app/api/v1/payments/session/[id]/route";
import { POST as flutterwaveWebhookHandler } from "../app/api/v1/payments/webhooks/flutterwave/route";

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

describe("Payments API - integration", () => {
  const createdPaymentSessionIds: string[] = [];
  let flutterwavePaymentRequestBody: Record<string, unknown> | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    flutterwavePaymentRequestBody = null;

    authMock.api.getSession.mockResolvedValue({
      user: { id: TEST_USER_ID, email: TEST_USER_EMAIL } as any,
      session: { activeOrganizationId: REAL_ORG_ID } as any,
    });

    process.env.PAYMENT_PLAN_GROWTH_AMOUNT_MINOR = "15000";
    process.env.PAYMENT_PLAN_BASIC_AMOUNT_MINOR = "5000";
    process.env.PAYMENT_PLAN_PRO_AMOUNT_MINOR = "50000";
    process.env.PAYMENT_CREDIT_UNIT_AMOUNT_MINOR = "10";
    process.env.PAYMENT_RETURN_URL =
      "https://reachdem.example.com/settings/workspace";
    process.env.FLUTTERWAVE_V4_BASE_URL = "https://api.flutterwave.com/v3";
    process.env.FLUTTERWAVE_SECRET_KEY = "flw-secret";
    process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH = "flw-webhook-secret";
    process.env.FLUTTERWAVE_PAYMENT_OPTIONS =
      "card,banktransfer,ussd,mobilemoneyghana";

    const originalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url === "https://api.flutterwave.com/v3/payments") {
          flutterwavePaymentRequestBody = init?.body
            ? (JSON.parse(String(init.body)) as Record<string, unknown>)
            : null;
          return new Response(
            JSON.stringify({
              data: {
                id: 12345,
                tx_ref: `flw-${Date.now()}`,
                link: "https://checkout.flutterwave.test/session",
              },
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  afterAll(async () => {
    if (createdPaymentSessionIds.length > 0) {
      const sessions = await prisma.paymentSession.findMany({
        where: { id: { in: createdPaymentSessionIds } },
        select: { providerReference: true },
      });
      const providerReferences = sessions
        .map((session) => session.providerReference)
        .filter((value): value is string => Boolean(value));

      await prisma.paymentWebhookEvent.deleteMany({
        where: {
          providerReference: { in: providerReferences },
        },
      });
      await prisma.paymentTransaction.deleteMany({
        where: { paymentSessionId: { in: createdPaymentSessionIds } },
      });
      await prisma.paymentSession.deleteMany({
        where: { id: { in: createdPaymentSessionIds } },
      });
      await prisma.organization.update({
        where: { id: REAL_ORG_ID },
        data: {
          planCode: "free",
          creditBalance: 0,
          smsQuotaUsed: 0,
          emailQuotaUsed: 0,
        },
      });
    }
  });

  it("POST /payments/session creates a Flutterwave-backed subscription session", async () => {
    const req = new NextRequest("http://localhost/api/v1/payments/session", {
      method: "POST",
      body: JSON.stringify({
        kind: "subscription",
        planCode: "growth",
        currency: "XAF",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await createPaymentSessionHandler(req, {} as any);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.provider).toBe("flutterwave");
    expect(body.status).toBe("providerRedirected");
    expect(body.checkoutUrl).toBeTruthy();
    createdPaymentSessionIds.push(body.paymentSessionId);

    const session = await prisma.paymentSession.findUnique({
      where: { id: body.paymentSessionId },
      include: { transactions: true },
    });

    expect(session).toBeTruthy();
    expect(session?.amountMinor).toBe(15000);
    expect(session?.providerSelected).toBe("flutterwave");
    expect(session?.transactions).toHaveLength(1);
    expect(flutterwavePaymentRequestBody?.payment_options).toBe(
      "card,banktransfer,ussd,mobilemoneyghana"
    );
  });

  it("returns an error when Flutterwave session creation fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "https://api.flutterwave.com/v3/payments") {
          return new Response("upstream error", { status: 502 });
        }
        return new Response("not found", { status: 404 });
      })
    );

    const req = new NextRequest("http://localhost/api/v1/payments/session", {
      method: "POST",
      body: JSON.stringify({
        kind: "creditPurchase",
        creditsQuantity: 500,
        currency: "USD",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await createPaymentSessionHandler(req, {} as any);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Internal Server Error");

    const session = await prisma.paymentSession.findFirst({
      where: {
        organizationId: REAL_ORG_ID,
        initiatedByUserId: TEST_USER_ID,
        kind: "creditPurchase",
        currency: "USD",
      },
      orderBy: { createdAt: "desc" },
    });

    expect(session).toBeTruthy();
    expect(session?.amountMinor).toBe(5000);
    expect(session?.providerSelected).toBeNull();
    expect(session?.status).toBe("failed");

    if (session) {
      createdPaymentSessionIds.push(session.id);
    }
  });

  it("GET /payments/session/:id returns the stored session and transactions", async () => {
    const createReq = new NextRequest(
      "http://localhost/api/v1/payments/session",
      {
        method: "POST",
        body: JSON.stringify({
          kind: "subscription",
          planCode: "growth",
          currency: "XAF",
        }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const createRes = await createPaymentSessionHandler(createReq, {} as any);
    const created = await createRes.json();
    createdPaymentSessionIds.push(created.paymentSessionId);

    const res = await getPaymentSessionHandler(
      new NextRequest(
        `http://localhost/api/v1/payments/session/${created.paymentSessionId}`,
        { method: "GET" }
      ),
      { params: Promise.resolve({ id: created.paymentSessionId }) }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.session.id).toBe(created.paymentSessionId);
    expect(body.transactions).toHaveLength(1);
  });

  it("Flutterwave webhook marks the session succeeded and activates the workspace plan", async () => {
    const createReq = new NextRequest(
      "http://localhost/api/v1/payments/session",
      {
        method: "POST",
        body: JSON.stringify({
          kind: "subscription",
          planCode: "growth",
          currency: "XAF",
        }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const createRes = await createPaymentSessionHandler(createReq, {} as any);
    const created = await createRes.json();
    createdPaymentSessionIds.push(created.paymentSessionId);

    const session = await prisma.paymentSession.findUniqueOrThrow({
      where: { id: created.paymentSessionId },
      include: { transactions: true },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (
          url.startsWith(
            "https://api.flutterwave.com/v3/transactions/999999/verify"
          )
        ) {
          return new Response(
            JSON.stringify({
              data: {
                id: 999999,
                tx_ref: session.providerReference,
                reference: session.providerReference,
                status: "successful",
                amount: 15000,
                currency: "XAF",
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        return new Response("not found", { status: 404 });
      })
    );

    const payload = {
      id: randomUUID(),
      status: "successful",
      tx_ref: session.providerReference,
      data: {
        id: 999999,
        tx_ref: session.providerReference,
        reference: session.providerReference,
        status: "successful",
      },
    };

    const rawBody = JSON.stringify(payload);
    const signature = createHmac("sha256", "flw-webhook-secret")
      .update(rawBody)
      .digest("base64");

    const res = await flutterwaveWebhookHandler(
      new NextRequest("http://localhost/api/v1/payments/webhooks/flutterwave", {
        method: "POST",
        body: rawBody,
        headers: {
          "Content-Type": "application/json",
          "flutterwave-signature": signature,
        },
      })
    );

    expect(res.status).toBe(200);

    const updatedSession = await prisma.paymentSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(updatedSession.status).toBe("succeeded");
    expect(updatedSession.activatedAt).toBeTruthy();

    const organization = await prisma.organization.findUnique({
      where: { id: REAL_ORG_ID },
    });
    expect(organization?.planCode).toBe("growth");
  });

  it("POST /payments/session/:id reconciles a Flutterwave redirect and fulfills the purchase", async () => {
    const createReq = new NextRequest(
      "http://localhost/api/v1/payments/session",
      {
        method: "POST",
        body: JSON.stringify({
          kind: "creditPurchase",
          creditsQuantity: 250,
          currency: "XAF",
        }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const createRes = await createPaymentSessionHandler(createReq, {} as any);
    const created = await createRes.json();
    createdPaymentSessionIds.push(created.paymentSessionId);

    const session = await prisma.paymentSession.findUniqueOrThrow({
      where: { id: created.paymentSessionId },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (
          url === "https://api.flutterwave.com/v3/transactions/777777/verify"
        ) {
          return new Response(
            JSON.stringify({
              data: {
                id: 777777,
                tx_ref: session.providerReference,
                reference: session.providerReference,
                status: "successful",
                amount: 5000,
                currency: "XAF",
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        return new Response("not found", { status: 404 });
      })
    );

    const res = await reconcilePaymentSessionHandler(
      new NextRequest(
        `http://localhost/api/v1/payments/session/${created.paymentSessionId}`,
        {
          method: "POST",
          body: JSON.stringify({
            provider: "flutterwave",
            providerReference: session.providerReference,
            providerTransactionId: "777777",
            status: "successful",
          }),
          headers: { "Content-Type": "application/json" },
        }
      ),
      { params: Promise.resolve({ id: created.paymentSessionId }) }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.session.status).toBe("succeeded");
    expect(body.transactions[0].providerTransactionId).toBe("777777");

    const organization = await prisma.organization.findUnique({
      where: { id: REAL_ORG_ID },
    });
    expect(organization?.creditBalance).toBeGreaterThanOrEqual(250);
  });
});
