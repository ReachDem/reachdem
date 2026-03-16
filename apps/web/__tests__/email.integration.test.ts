import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as sendEmailHandler } from "../app/api/v1/email/send/route";
import { ProcessEmailMessageJobUseCase } from "@reachdem/core";
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
const TEST_EMAIL_TO = process.env.TEST_EMAIL_TO;

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ?? "465";
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_SECURE = process.env.SMTP_SECURE ?? "true";
const SENDER_EMAIL = process.env.SENDER_EMAIL ?? SMTP_USER;
const SENDER_NAME = process.env.SENDER_NAME ?? "ReachDem Notifications";

if (!REAL_ORG_ID || !TEST_USER_ID || !TEST_USER_EMAIL) {
  throw new Error(
    "Missing required test env vars: TEST_ORG_ID, TEST_USER_ID, TEST_USER_EMAIL"
  );
}

describe("Email API - integration", () => {
  const createdMessageIds: string[] = [];
  const workerBaseUrl =
    process.env.EMAIL_WORKER_BASE_URL ??
    process.env.CLOUDFLARE_WORKER_BASE_URL ??
    "http://127.0.0.1:8787";

  beforeEach(() => {
    vi.clearAllMocks();
    const originalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === `${workerBaseUrl}/queue/email`) {
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

  if (
    !TEST_EMAIL_TO ||
    !SMTP_HOST ||
    !SMTP_USER ||
    !SMTP_PASSWORD ||
    !SENDER_EMAIL
  ) {
    it("skips when SMTP or target email env vars are missing", () => {
      console.log(
        "[Email API Integration] Set TEST_EMAIL_TO, SMTP_HOST, SMTP_USER, SMTP_PASSWORD and SENDER_EMAIL to run the full flow."
      );
      expect(TEST_EMAIL_TO).toBeUndefined();
    });
    return;
  }

  it("runs the full flow API -> queue publish -> worker process", async () => {
    const idempotencyKey = `email-integration-${Date.now()}`;
    const subject = `ReachDem API email test ${new Date().toISOString()}`;
    const html = `
        <h2>ReachDem email integration test</h2>
        <p>This email went through API -> queue publish -> worker process.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      `;

    const req = new NextRequest("http://localhost/api/v1/email/send", {
      method: "POST",
      body: JSON.stringify({
        to: TEST_EMAIL_TO,
        subject,
        html,
        from: SENDER_NAME,
        idempotency_key: idempotencyKey,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await sendEmailHandler(req, {} as any);
    const body = await res.json();

    expect([200, 201]).toContain(res.status);
    expect(body).toHaveProperty("message_id");
    expect(body.status).toBe("queued");
    createdMessageIds.push(body.message_id);

    const nodemailer = (await import("../../workers/node_modules/nodemailer"))
      .default;

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT, 10),
      secure: SMTP_SECURE === "true",
      authMethod: "LOGIN",
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
    });

    const outcome = await ProcessEmailMessageJobUseCase.execute(
      {
        message_id: body.message_id,
        organization_id: REAL_ORG_ID,
        channel: "email",
        delivery_cycle: 1,
      },
      {
        republish: async () => {
          throw new Error("Unexpected republish during email integration test");
        },
        sendEmail: async ({
          to,
          subject: sendSubject,
          html: sendHtml,
          from,
        }) => {
          const startedAt = Date.now();
          try {
            const info = await transporter.sendMail({
              from: `"${from}" <${SENDER_EMAIL}>`,
              to,
              subject: sendSubject,
              html: sendHtml,
            });

            console.log(
              `[Email Integration] success=true to=${to} messageId=${info.messageId}`
            );
            console.log(
              `[Email Integration] accepted=${JSON.stringify(info.accepted)} rejected=${JSON.stringify(info.rejected)}`
            );

            return {
              success: true,
              providerName: "smtp",
              providerMessageId: info.messageId,
              durationMs: Date.now() - startedAt,
            };
          } catch (error) {
            console.log(
              `[Email Integration] success=false to=${to} error=${error instanceof Error ? error.message : "Unknown error"}`
            );
            return {
              success: false,
              providerName: "smtp",
              errorCode: "SMTP_SEND_FAILED",
              errorMessage:
                error instanceof Error ? error.message : "Unknown SMTP error",
              durationMs: Date.now() - startedAt,
            };
          }
        },
      }
    );

    const message = await prisma.message.findUnique({
      where: { id: body.message_id },
      include: { attempts: true },
    });

    expect(outcome).toBe("sent");
    expect(message).not.toBeNull();
    expect(message!.status).toBe("sent");
    expect(message!.providerSelected).toBe("smtp");
    expect(message!.attempts).toHaveLength(1);
    expect(message!.attempts[0].provider).toBe("smtp");
    expect(message!.attempts[0].status).toBe("sent");
  }, 60_000);
});
