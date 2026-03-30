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
import { POST as flutterwaveWebhookHandler } from "../app/api/v1/payments/webhooks/flutterwave/route";
import { POST as stripeWebhookHandler } from "../app/api/v1/payments/webhooks/stripe/route";

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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();

    authMock.api.getSession.mockResolvedValue({
      user: { id: TEST_USER_ID, email: TEST_USER_EMAIL } as any,
      session: { activeOrganizationId: REAL_ORG_ID } as any,
    });

    process.env.PAYMENT_PLAN_GROWTH_AMOUNT_MINOR = "15000";
    process.env.PAYMENT_CREDIT_UNIT_AMOUNT_MINOR = "10";
    process.env.PAYMENT_RETURN_URL =
      "https://reachdem.example.com/dashboard/billing";
    process.env.FLUTTERWAVE_V4_BASE_URL = "https://api.flutterwave.com/v3";
    process.env.FLUTTERWAVE_SECRET_KEY = "flw-secret";
    process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH = "flw-webhook-secret";
    process.env.STRIPE_SECRET_KEY = "stripe-secret";
    process.env.STRIPE_WEBHOOK_SECRET = "stripe-webhook-secret";

    const originalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url === "https://api.flutterwave.com/v3/payments") {
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

        if (url === "https://api.stripe.com/v1/checkout/sessions") {
          return new Response(
            JSON.stringify({
              id: `cs_test_${Date.now()}`,
              url: "https://checkout.stripe.test/session",
              payment_intent: `pi_${Date.now()}`,
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
  });

  it("falls back to Stripe when Flutterwave session creation fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "https://api.flutterwave.com/v3/payments") {
          return new Response("upstream error", { status: 502 });
        }
        if (url === "https://api.stripe.com/v1/checkout/sessions") {
          return new Response(
            JSON.stringify({
              id: `cs_test_${Date.now()}`,
              url: "https://checkout.stripe.test/fallback",
              payment_intent: `pi_${Date.now()}`,
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

    expect(res.status).toBe(201);
    expect(body.provider).toBe("stripe");
    createdPaymentSessionIds.push(body.paymentSessionId);

    const session = await prisma.paymentSession.findUnique({
      where: { id: body.paymentSessionId },
    });
    expect(session?.amountMinor).toBe(5000);
    expect(session?.providerSelected).toBe("stripe");
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

        if (url.startsWith("https://api.flutterwave.com/v3/charges/")) {
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

    const res = await flutterwaveWebhookHandler(
      new NextRequest("http://localhost/api/v1/payments/webhooks/flutterwave", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          "verif-hash": "flw-webhook-secret",
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

  it("Stripe webhook with invalid signature is rejected", async () => {
    const payload = JSON.stringify({
      id: "evt_invalid",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_invalid",
          payment_intent: "pi_invalid",
        },
      },
    });

    const res = await stripeWebhookHandler(
      new NextRequest("http://localhost/api/v1/payments/webhooks/stripe", {
        method: "POST",
        body: payload,
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "t=1,v1=bad",
        },
      })
    );

    expect(res.status).toBe(401);
  });

  it("Stripe webhook marks credit purchase succeeded and increments balance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "https://api.flutterwave.com/v3/payments") {
          return new Response("upstream error", { status: 502 });
        }
        if (url === "https://api.stripe.com/v1/checkout/sessions") {
          return new Response(
            JSON.stringify({
              id: `cs_test_${Date.now()}`,
              url: "https://checkout.stripe.test/fallback",
              payment_intent: `pi_${Date.now()}`,
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

    const createReq = new NextRequest(
      "http://localhost/api/v1/payments/session",
      {
        method: "POST",
        body: JSON.stringify({
          kind: "creditPurchase",
          creditsQuantity: 200,
          currency: "USD",
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

    const event = {
      id: `evt_${Date.now()}`,
      type: "checkout.session.completed",
      data: {
        object: {
          id: session.providerSessionId,
          payment_intent: session.providerReference,
          metadata: {
            paymentSessionId: session.id,
          },
        },
      },
    };
    const rawBody = JSON.stringify(event);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac("sha256", "stripe-webhook-secret")
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");

    const res = await stripeWebhookHandler(
      new NextRequest("http://localhost/api/v1/payments/webhooks/stripe", {
        method: "POST",
        body: rawBody,
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": `t=${timestamp},v1=${signature}`,
        },
      })
    );

    expect(res.status).toBe(200);

    const organization = await prisma.organization.findUnique({
      where: { id: REAL_ORG_ID },
    });
    expect(organization?.creditBalance).toBeGreaterThanOrEqual(200);
  });
});
