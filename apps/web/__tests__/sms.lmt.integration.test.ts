/**
 * LMT SMS Integration Test
 *
 * Envoie un vrai SMS vers +237654495152 via LMT Group.
 * Variables d'environnement requises dans .env (racine) :
 *
 *   LMT_API_KEY=<clé API LMT>
 *   LMT_SECRET=<secret LMT>
 *   LMT_SENDER_ID=<sender ID enregistré chez LMT, ex: "ReachDem">
 *   TEST_ORG_ID=<id organisation en base>
 *   TEST_USER_ID=<id utilisateur de test>
 *   TEST_USER_EMAIL=<email utilisateur de test>
 *
 * Lancer ce test seul :
 *   pnpm vitest run apps/web/__tests__/sms.lmt.integration.test.ts
 */

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

// ─── Required env vars ────────────────────────────────────────────────────────

const REAL_ORG_ID = process.env.TEST_ORG_ID;
const TEST_USER_ID = process.env.TEST_USER_ID;
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
const LMT_API_KEY = process.env.LMT_API_KEY;
const LMT_SECRET = process.env.LMT_SECRET;
const LMT_SENDER_ID = process.env.LMT_SENDER_ID ?? "ReachDem";

if (!REAL_ORG_ID || !TEST_USER_ID || !TEST_USER_EMAIL) {
  throw new Error(
    "Missing required test env vars: TEST_ORG_ID, TEST_USER_ID, TEST_USER_EMAIL"
  );
}

if (!LMT_API_KEY || !LMT_SECRET) {
  throw new Error(
    "Missing LMT credentials: LMT_API_KEY and LMT_SECRET must be set in .env"
  );
}

// ─── Numéro cible ─────────────────────────────────────────────────────────────

const TARGET_PHONE = "+237654495152";

// ─────────────────────────────────────────────────────────────────────────────

describe("SMS LMT - Envoi réel vers +237654495152", () => {
  const createdMessageIds: string[] = [];
  let hadExistingConfig = false;
  let originalProvider: string | null = null;
  const workerBaseUrl =
    process.env.SMS_WORKER_BASE_URL ??
    process.env.CLOUDFLARE_WORKER_BASE_URL ??
    "http://127.0.0.1:8787";

  /** Bascule le workspace sur LMT comme provider principal */
  beforeAll(async () => {
    const existing = await prisma.workspaceSmsConfig.findUnique({
      where: { organizationId: REAL_ORG_ID! },
    });

    if (existing) {
      hadExistingConfig = true;
      originalProvider = existing.primaryProvider;
      await prisma.workspaceSmsConfig.update({
        where: { organizationId: REAL_ORG_ID! },
        data: { primaryProvider: "lmt", secondaryProviders: [] },
      });
    } else {
      await prisma.workspaceSmsConfig.create({
        data: {
          organizationId: REAL_ORG_ID!,
          primaryProvider: "lmt",
          secondaryProviders: [],
        },
      });
    }
  });

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
    // Nettoyage des messages créés pendant le test
    if (createdMessageIds.length > 0) {
      await prisma.messageAttempt.deleteMany({
        where: { messageId: { in: createdMessageIds } },
      });
      await prisma.message.deleteMany({
        where: { id: { in: createdMessageIds } },
      });
    }

    // Restaure la config SMS d'origine
    if (hadExistingConfig && originalProvider) {
      await prisma.workspaceSmsConfig.update({
        where: { organizationId: REAL_ORG_ID! },
        data: {
          primaryProvider: originalProvider as any,
          secondaryProviders: [],
        },
      });
    } else if (!hadExistingConfig) {
      await prisma.workspaceSmsConfig.delete({
        where: { organizationId: REAL_ORG_ID! },
      });
    }
  });

  // ─── Test principal ────────────────────────────────────────────────────────

  it("envoie un vrai SMS via LMT et le persiste en base", async () => {
    const idem = `lmt-test-${Date.now()}`;

    const req = new NextRequest("http://localhost/api/v1/sms/send", {
      method: "POST",
      body: JSON.stringify({
        to: TARGET_PHONE,
        text: "Test ReachDem via LMT Group - integration test",
        from: LMT_SENDER_ID,
        idempotency_key: idem,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await sendSmsHandler(req, {} as any);
    const body = await res.json();

    console.log("[LMT Test] Response:", JSON.stringify(body, null, 2));

    expect(res.status).toBe(201);
    expect(body).toHaveProperty("message_id");
    expect(body.status).toBe("queued");
    expect(body.correlation_id).toBeDefined();

    createdMessageIds.push(body.message_id);

    const outcome = await ProcessSmsMessageJobUseCase.execute(
      {
        message_id: body.message_id,
        organization_id: REAL_ORG_ID!,
        channel: "sms",
        delivery_cycle: 1,
      },
      {
        republish: async () => {
          throw new Error("Unexpected republish in LMT integration test");
        },
      }
    );
    expect(outcome).toBe("sent");

    // Vérification en base de données
    const msg = await prisma.message.findUnique({
      where: { id: body.message_id },
      include: { attempts: true },
    });

    expect(msg).not.toBeNull();
    expect(msg!.status).toBe("sent");
    expect(msg!.providerSelected).toBe("lmt");
    expect(msg!.attempts).toHaveLength(1);
    expect(msg!.attempts[0].status).toBe("sent");
    expect(msg!.attempts[0].provider).toBe("lmt");
    // 4 derniers chiffres de +237654495152
    expect(msg!.toLast4).toBe("5152");

    console.log(
      `[LMT Test] ✅ SMS envoyé — providerMessageId: ${msg!.attempts[0].providerMessageId}`
    );
  }, 30_000);
});
