import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@reachdem/database";
import { POST as createDirectChargeHandler } from "../app/api/v1/payments/charge/route";
import { GET as verifyDirectChargeHandler } from "../app/api/v1/payments/verify/route";

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

describe("Payments API - direct charge integration", () => {
  const createdPaymentSessionIds: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();

    authMock.api.getSession.mockResolvedValue({
      user: { id: TEST_USER_ID, email: TEST_USER_EMAIL } as any,
      session: { activeOrganizationId: REAL_ORG_ID } as any,
    });

    process.env.FLUTTERWAVE_V4_CLIENT_ID = "client-id";
    process.env.FLUTTERWAVE_V4_CLIENT_SECRET = "client-secret";
    process.env.NEXT_PUBLIC_APP_URL = "https://reachdem.example.com";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (
          url ===
          "https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token"
        ) {
          return new Response(
            JSON.stringify({
              access_token: "access-token",
              expires_in: 3600,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        if (
          url === "https://api.flutterwave.com/v4/orchestration/direct-charges"
        ) {
          return new Response(
            JSON.stringify({
              data: {
                id: "charge_123",
                status: "pending",
                reference: "pay1234567890abcdef1234567890abcd",
                next_action: {
                  type: "redirect_url",
                  redirect_url: {
                    url: "https://flutterwave.example.com/authorize",
                  },
                },
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        if (url === "https://api.flutterwave.com/v4/charges/charge_123") {
          return new Response(
            JSON.stringify({
              data: {
                id: "charge_123",
                status: "successful",
                reference: "pay1234567890abcdef1234567890abcd",
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response("not found", { status: 404 });
      })
    );
  });

  afterAll(async () => {
    if (createdPaymentSessionIds.length > 0) {
      await prisma.paymentTransaction.deleteMany({
        where: { paymentSessionId: { in: createdPaymentSessionIds } },
      });
      await prisma.paymentSession.deleteMany({
        where: { id: { in: createdPaymentSessionIds } },
      });
    }
  });

  it("creates and verifies an amount-based direct charge", async () => {
    const createReq = new NextRequest(
      "http://localhost/api/v1/payments/charge",
      {
        method: "POST",
        body: JSON.stringify({
          kind: "creditPurchase",
          currency: "XAF",
          amountMinor: 10000,
          paymentMethodType: "mobile_money",
          customerName: { first: "Reach", last: "Dem" },
          email: TEST_USER_EMAIL,
          phone: { countryCode: "237", number: "670000000" },
          mobileMoneyNetwork: "MTN",
        }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const createRes = await createDirectChargeHandler(createReq, {} as any);
    const created = await createRes.json();

    expect(createRes.status).toBe(201);
    expect(created.success).toBe(true);
    expect(created.paymentSessionId).toBeTruthy();
    createdPaymentSessionIds.push(created.paymentSessionId);

    const session = await prisma.paymentSession.findUniqueOrThrow({
      where: { id: created.paymentSessionId },
    });

    expect(session.amountMinor).toBe(10000);
    expect(session.creditsQuantity).toBeGreaterThan(0);
    expect(session.status).toBe("providerRedirected");

    const verifyReq = new NextRequest(
      "http://localhost/api/v1/payments/verify?chargeId=charge_123",
      { method: "GET" }
    );
    const verifyRes = await verifyDirectChargeHandler(verifyReq, {} as any);
    const verified = await verifyRes.json();

    expect(verifyRes.status).toBe(200);
    expect(verified.success).toBe(true);

    const updatedSession = await prisma.paymentSession.findUniqueOrThrow({
      where: { id: created.paymentSessionId },
    });
    expect(updatedSession.status).toBe("succeeded");
    expect(updatedSession.activatedAt).toBeTruthy();
  });
});
