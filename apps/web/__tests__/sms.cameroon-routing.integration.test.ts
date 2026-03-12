/**
 * Cameroon SMS Routing Integration Test
 *
 * Envoie 4 vrais SMS:
 * - 2 numéros MTN
 * - 2 numéros Orange
 *
 * Variables d'environnement requises:
 *   TEST_ORG_ID
 *   TEST_USER_ID
 *   TEST_USER_EMAIL
 *   TEST_MTN_PHONE_1
 *   TEST_MTN_PHONE_2
 *   TEST_ORANGE_PHONE_1
 *   TEST_ORANGE_PHONE_2
 *   LMT_API_KEY
 *   LMT_SECRET
 *   AVLYTEXT_API_KEY
 *   MBOA_SMS_USERID
 *   MBOA_SMS_API_PASSWORD
 *
 * Lancer ce test seul:
 *   pnpm exec dotenv -e .env -e apps/web/.env.local -- vitest run apps/web/__tests__/sms.cameroon-routing.integration.test.ts
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as sendSmsHandler } from "../app/api/v1/sms/send/route";
import { ProcessSmsMessageJobUseCase } from "@reachdem/core";
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

const REAL_ORG_ID = process.env.TEST_ORG_ID;
const TEST_USER_ID = process.env.TEST_USER_ID;
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;

const TEST_MTN_PHONE_1 = process.env.TEST_MTN_PHONE_1;
const TEST_MTN_PHONE_2 = process.env.TEST_MTN_PHONE_2;
const TEST_ORANGE_PHONE_1 = process.env.TEST_ORANGE_PHONE_1;
const TEST_ORANGE_PHONE_2 = process.env.TEST_ORANGE_PHONE_2;

if (!REAL_ORG_ID || !TEST_USER_ID || !TEST_USER_EMAIL) {
  throw new Error(
    "Missing required test env vars: TEST_ORG_ID, TEST_USER_ID, TEST_USER_EMAIL"
  );
}

if (
  !TEST_MTN_PHONE_1 ||
  !TEST_MTN_PHONE_2 ||
  !TEST_ORANGE_PHONE_1 ||
  !TEST_ORANGE_PHONE_2
) {
  throw new Error(
    "Missing required routing test phones: TEST_MTN_PHONE_1, TEST_MTN_PHONE_2, TEST_ORANGE_PHONE_1, TEST_ORANGE_PHONE_2"
  );
}

type RoutingCase = {
  label: string;
  phone: string;
  primaryProvider: string;
  fallbackProvider: string;
  senderForProvider: Record<string, string>;
};

const ROUTING_CASES: RoutingCase[] = [
  {
    label: "MTN #1",
    phone: TEST_MTN_PHONE_1,
    primaryProvider: "lmt",
    fallbackProvider: "mboaSms",
    senderForProvider: {
      lmt: "ReachDem",
      mboaSms: "infos",
    },
  },
  {
    label: "MTN #2",
    phone: TEST_MTN_PHONE_2,
    primaryProvider: "lmt",
    fallbackProvider: "mboaSms",
    senderForProvider: {
      lmt: "ReachDem",
      mboaSms: "infos",
    },
  },
  {
    label: "Orange #1",
    phone: TEST_ORANGE_PHONE_1,
    primaryProvider: "avlytext",
    fallbackProvider: "mboaSms",
    senderForProvider: {
      avlytext: "ReachDem Orange",
      mboaSms: "ReachDem Orange",
    },
  },
  {
    label: "Orange #2",
    phone: TEST_ORANGE_PHONE_2,
    primaryProvider: "avlytext",
    fallbackProvider: "mboaSms",
    senderForProvider: {
      avlytext: "ReachDem Orange",
      mboaSms: "ReachDem Orange",
    },
  },
];

describe("SMS Cameroon routing - real sends", () => {
  const createdMessageIds: string[] = [];
  const workerBaseUrl =
    process.env.SMS_WORKER_BASE_URL ??
    process.env.CLOUDFLARE_WORKER_BASE_URL ??
    "http://127.0.0.1:8787";

  beforeEach(() => {
    vi.clearAllMocks();
    const originalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === `${workerBaseUrl}/queue/sms`) {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return originalFetch(input, init);
      })
    );
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: TEST_USER_ID, email: TEST_USER_EMAIL } as any,
      session: { activeOrganizationId: REAL_ORG_ID } as any,
    });
  });

  afterAll(async () => {
    if (createdMessageIds.length > 0) {
      await prisma.messageAttempt.deleteMany({
        where: { messageId: { in: createdMessageIds } },
      });
      await prisma.message.deleteMany({
        where: { id: { in: createdMessageIds } },
      });
    }
  });

  it("uses the primary provider for each network and logs fallback/errors when they happen", async () => {
    for (const testCase of ROUTING_CASES) {
      const idem = `cm-routing-${testCase.label.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`;
      const from = testCase.label.startsWith("Orange")
        ? "ReachDem Orange"
        : "RandomSender";

      const req = new NextRequest("http://localhost/api/v1/sms/send", {
        method: "POST",
        body: JSON.stringify({
          to: testCase.phone,
          text: `Routing integration test ${testCase.label} - ${new Date().toISOString()}`,
          from,
          idempotency_key: idem,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await sendSmsHandler(req, {} as any);
      const body = await res.json();

      expect([200, 201]).toContain(res.status);
      expect(body).toHaveProperty("message_id");
      expect(body.status).toBe("queued");
      createdMessageIds.push(body.message_id);

      const outcome = await ProcessSmsMessageJobUseCase.execute(
        {
          message_id: body.message_id,
          organization_id: REAL_ORG_ID,
          channel: "sms",
          delivery_cycle: 1,
        },
        {
          republish: async () => {
            throw new Error(
              "Unexpected republish during real routing integration test"
            );
          },
        }
      );

      const message = await prisma.message.findUnique({
        where: { id: body.message_id },
        include: { attempts: true },
      });
      const activityEvents = await prisma.activityEvent.findMany({
        where: {
          organizationId: REAL_ORG_ID,
          correlationId: body.correlation_id,
          category: "sms",
        },
        orderBy: { createdAt: "asc" },
      });

      expect(message).not.toBeNull();
      expect(["sent", "requeued", "failed"]).toContain(outcome);
      expect(message!.status).toBe("sent");
      expect([testCase.primaryProvider, testCase.fallbackProvider]).toContain(
        message!.providerSelected
      );
      expect(message!.from).toBe(
        testCase.senderForProvider[message!.providerSelected!]
      );
      expect(message!.attempts.length).toBeGreaterThanOrEqual(1);
      expect(message!.attempts[message!.attempts.length - 1].provider).toBe(
        message!.providerSelected
      );

      const fallbackEvents = activityEvents.filter(
        (event) => event.action === "fallback"
      );
      const errorEvents = activityEvents.filter(
        (event) => event.action === "send_failed"
      );
      const usedFallback =
        message!.providerSelected === testCase.fallbackProvider;

      if (usedFallback) {
        expect(fallbackEvents.length).toBeGreaterThan(0);
        console.log(
          `[CM Routing][Fallback] ${testCase.label} | primary=${testCase.primaryProvider} | fallback=${testCase.fallbackProvider}`
        );
      } else {
        expect(message!.providerSelected).toBe(testCase.primaryProvider);
      }

      if (errorEvents.length > 0) {
        for (const event of errorEvents) {
          const meta = (event.meta ?? {}) as {
            errorCode?: string;
            errorMessage?: string;
            retryable?: boolean;
            attemptNo?: number;
          };
          console.log(
            `[CM Routing][Error] ${testCase.label} | provider=${event.provider} | attempt=${meta.attemptNo ?? "n/a"} | code=${meta.errorCode ?? "n/a"} | message=${meta.errorMessage ?? "n/a"} | retryable=${meta.retryable ?? "n/a"}`
          );
        }
      }

      console.log(
        `[CM Routing][Result] ${testCase.label} | to=${testCase.phone} | primary=${testCase.primaryProvider} | selected=${message!.providerSelected} | sender=${message!.from} | providerMessageId=${message!.attempts[message!.attempts.length - 1].providerMessageId ?? "n/a"}`
      );
    }
  }, 120_000);
});
