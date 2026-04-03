import {
  PostHogAdminError,
  createPostHogAdminClient,
} from "@/lib/posthog-admin";

describe("posthog admin client", () => {
  it("posts HogQL queries to the documented query endpoint", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({
          results: [
            {
              day: "2026-03-31",
              visitors: 74,
            },
          ],
          is_cached: true,
        });
      },
    }));
    const client = createPostHogAdminClient({
      host: "https://us.posthog.com",
      projectId: "12345",
      personalApiKey: "phx_secret",
      visitorEvent: "$pageview",
      fetchImplementation: fetchMock,
    });

    const result = await client.getDailyUniqueVisitors({
      start: new Date("2026-03-31T00:00:00.000Z"),
      end: new Date("2026-03-31T23:59:59.999Z"),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://us.posthog.com/api/projects/12345/query/",
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(result.isCached).toBe(true);
    expect(result.results[0]).toEqual({
      date: "2026-03-31",
      value: 74,
    });
  });

  it("raises a typed error when PostHog responds with a failure", async () => {
    const client = createPostHogAdminClient({
      host: "https://us.posthog.com",
      projectId: "12345",
      personalApiKey: "phx_secret",
      visitorEvent: "$pageview",
      fetchImplementation: async () => ({
        ok: false,
        status: 401,
        async text() {
          return JSON.stringify({ detail: "Forbidden" });
        },
      }),
    });

    await expect(
      client.queryHogQL("select 1", "founder-admin test")
    ).rejects.toBeInstanceOf(PostHogAdminError);
  });
});
