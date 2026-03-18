import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@reachdem/database";
import { randomUUID } from "crypto";
import {
  POST as createLinkHandler,
  GET as listLinksHandler,
} from "../app/api/v1/links/route";
import {
  GET as getLinkHandler,
  PATCH as updateLinkHandler,
} from "../app/api/v1/links/[id]/route";
import { GET as getLinkStatsHandler } from "../app/api/v1/links/[id]/stats/route";

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
const SINK_API_BASE_URL = process.env.SINK_API_BASE_URL ?? "https://rcdm.ink";

if (!REAL_ORG_ID || !TEST_USER_ID || !TEST_USER_EMAIL) {
  throw new Error(
    "Missing required test env vars: TEST_ORG_ID, TEST_USER_ID, TEST_USER_EMAIL"
  );
}

describe("Links API - integration", () => {
  const createdLinkIds: string[] = [];
  let currentTargetUrl = "https://example.com/landing";
  let currentSlug = `reachdem-test-link-${Date.now()}`;
  let currentSinkId = `sink_${Date.now()}`;

  beforeEach(() => {
    vi.clearAllMocks();
    currentTargetUrl = "https://example.com/landing";
    currentSlug = `reachdem-test-link-${Date.now()}`;
    currentSinkId = `sink_${Date.now()}`;
    authMock.api.getSession.mockResolvedValue({
      user: { id: TEST_USER_ID, email: TEST_USER_EMAIL } as any,
      session: { activeOrganizationId: REAL_ORG_ID } as any,
    });

    const originalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (
          url === `${SINK_API_BASE_URL}/api/link/create` &&
          method === "POST"
        ) {
          return new Response(JSON.stringify({ slug: currentSlug }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (
          url === `${SINK_API_BASE_URL}/api/link/query?slug=${currentSlug}` &&
          method === "GET"
        ) {
          return new Response(
            JSON.stringify({
              url: currentTargetUrl,
              id: currentSinkId,
              slug: currentSlug,
              createdAt: 1773394442,
              updatedAt: 1773394788,
              cloaking: false,
              redirectWithQuery: true,
              title: "ReachDem test link",
              description: "ReachDem tracked link test",
              image: "/_assets/images/test.png",
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        if (url === `${SINK_API_BASE_URL}/api/link/edit` && method === "PUT") {
          const body =
            typeof init?.body === "string"
              ? JSON.parse(init.body)
              : init?.body
                ? JSON.parse(String(init.body))
                : {};
          if (body?.url) {
            currentTargetUrl = body.url;
          }
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (
          url === `${SINK_API_BASE_URL}/api/link/delete` &&
          method === "POST"
        ) {
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (
          url ===
            `${SINK_API_BASE_URL}/api/stats/counters?slug=${currentSlug}` &&
          method === "GET"
        ) {
          return new Response(
            JSON.stringify({
              data: [
                {
                  visits: "184",
                  visitors: 107,
                  referers: 4,
                },
              ],
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

  afterAll(async () => {
    if (createdLinkIds.length > 0) {
      await prisma.trackedLink.deleteMany({
        where: { id: { in: createdLinkIds } },
      });
    }
  });

  async function createFixtureLink() {
    const req = new NextRequest("http://localhost/api/v1/links", {
      method: "POST",
      body: JSON.stringify({
        targetUrl: "https://example.com/landing",
        slug: currentSlug,
        channel: "email",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await createLinkHandler(req, {} as any);
    const body = await res.json();
    return { res, body };
  }

  it("POST /links creates a tracked link and persists the Sink mapping", async () => {
    const { res, body } = await createFixtureLink();

    expect(res.status).toBe(201);
    expect(body.slug).toBe(currentSlug);
    expect(body.sinkLinkId).toBe(currentSinkId);
    expect(body.targetUrl).toBe("https://example.com/landing");
    createdLinkIds.push(body.id);
  });

  it("GET /links lists tracked links for the active workspace", async () => {
    const { res: createRes, body: created } = await createFixtureLink();
    expect(createRes.status).toBe(201);
    createdLinkIds.push(created.id);

    const req = new NextRequest("http://localhost/api/v1/links?limit=10", {
      method: "GET",
    });

    const res = await listLinksHandler(req, {} as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.some((item: any) => item.slug === currentSlug)).toBe(
      true
    );
  });

  it("GET /links/:id returns a single tracked link", async () => {
    const { res: createRes, body: created } = await createFixtureLink();
    expect(createRes.status).toBe(201);
    createdLinkIds.push(created.id);
    const linkId = created.id;

    const res = await getLinkHandler(
      new NextRequest(`http://localhost/api/v1/links/${linkId}`, {
        method: "GET",
      }),
      { params: Promise.resolve({ id: linkId }) }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe(linkId);
    expect(body.slug).toBe(currentSlug);
  });

  it("PATCH /links/:id updates the target URL through Sink", async () => {
    const { res: createRes, body: created } = await createFixtureLink();
    expect(createRes.status).toBe(201);
    createdLinkIds.push(created.id);
    const linkId = created.id;

    const res = await updateLinkHandler(
      new NextRequest(`http://localhost/api/v1/links/${linkId}`, {
        method: "PATCH",
        body: JSON.stringify({
          targetUrl: "https://example.com/updated",
        }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: linkId }) }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.targetUrl).toBe("https://example.com/updated");
  });

  it("GET /links/:id/stats refreshes totalClicks and uniqueClicks from Sink", async () => {
    const { res: createRes, body: created } = await createFixtureLink();
    expect(createRes.status).toBe(201);
    createdLinkIds.push(created.id);
    const linkId = created.id;

    const res = await getLinkStatsHandler(
      new NextRequest(`http://localhost/api/v1/links/${linkId}/stats`, {
        method: "GET",
      }),
      { params: Promise.resolve({ id: linkId }) }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.totalClicks).toBe(184);
    expect(body.uniqueClicks).toBe(107);
    expect(body.lastStatsSyncAt).toBeTruthy();
  });

  it("GET /links/:id returns 404 outside the workspace", async () => {
    const foreignOrg = await prisma.organization.create({
      data: {
        id: randomUUID(),
        name: `Links Foreign Org ${Date.now()}`,
        slug: `links-foreign-org-${Date.now()}`,
      },
    });

    const foreignLink = await prisma.trackedLink.create({
      data: {
        organizationId: foreignOrg.id,
        sinkLinkId: `sink_foreign_${Date.now()}`,
        slug: `foreign-link-${Date.now()}`,
        shortUrl: "https://rcdm.ink/foreign-link",
        targetUrl: "https://example.com/foreign",
      },
    });

    const res = await getLinkHandler(
      new NextRequest(`http://localhost/api/v1/links/${foreignLink.id}`, {
        method: "GET",
      }),
      { params: Promise.resolve({ id: foreignLink.id }) }
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Not Found");

    await prisma.trackedLink.delete({ where: { id: foreignLink.id } });
    await prisma.organization.delete({ where: { id: foreignOrg.id } });
  });

  it("GET /links/:id/stats returns 500 when Sink is unavailable", async () => {
    const { res: createRes, body: created } = await createFixtureLink();
    expect(createRes.status).toBe(201);
    createdLinkIds.push(created.id);
    const linkId = created.id;
    const originalFetch = globalThis.fetch;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (
          url === `${SINK_API_BASE_URL}/api/stats/counters?slug=${currentSlug}`
        ) {
          return new Response("Sink down", { status: 503 });
        }
        return originalFetch(input, init);
      })
    );

    const res = await getLinkStatsHandler(
      new NextRequest(`http://localhost/api/v1/links/${linkId}/stats`, {
        method: "GET",
      }),
      { params: Promise.resolve({ id: linkId }) }
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Internal Server Error");
  });
});
