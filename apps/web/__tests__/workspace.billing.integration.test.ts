import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@reachdem/database";
import { GET as getWorkspaceBillingHandler } from "../app/api/v1/workspace/billing/route";

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

describe("Workspace billing API - integration", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    authMock.api.getSession.mockResolvedValue({
      user: { id: TEST_USER_ID, email: TEST_USER_EMAIL } as any,
      session: { activeOrganizationId: REAL_ORG_ID } as any,
    });

    await prisma.organization.update({
      where: { id: REAL_ORG_ID },
      data: {
        planCode: "growth",
        creditBalance: 42,
        smsQuotaUsed: 2,
        emailQuotaUsed: 7,
        workspaceVerificationStatus: "verified",
        workspaceVerifiedAt: new Date(),
        senderId: "REACHDEM",
      },
    });
  });

  it("returns the normalized workspace billing summary", async () => {
    const req = new NextRequest("http://localhost/api/v1/workspace/billing");
    const res = await getWorkspaceBillingHandler(req, {} as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.organizationId).toBe(REAL_ORG_ID);
    expect(body.planCode).toBe("growth");
    expect(body.creditBalance).toBe(42);
    expect(body.senderId).toBe("REACHDEM");
    expect(body.workspaceVerificationStatus).toBe("verified");
    expect(body.smsIncludedLimit).toBeNull();
    expect(body.emailIncludedLimit).toBeNull();
    expect(body.smsQuotaRemaining).toBeNull();
    expect(body.emailQuotaRemaining).toBeNull();
    expect(body.usesSharedCredits).toBe(true);
    expect(body.availablePlans).toHaveLength(4);
    expect(body.creditPricing.currency).toBe("XAF");
  });
});
