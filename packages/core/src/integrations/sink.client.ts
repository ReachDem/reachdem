import { z } from "zod";

const sinkLinkResponseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  url: z.string().url(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  cloaking: z.boolean().optional(),
  redirectWithQuery: z.boolean().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
});

const sinkCreateResponseSchema = z.object({
  link: z.object({
    id: z.string(),
    url: z.string().url(),
    slug: z.string(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
  }),
  shortLink: z.string().url(),
});

const sinkCountersResponseSchema = z.object({
  data: z
    .array(
      z.object({
        visits: z.union([z.string(), z.number(), z.null()]).optional(),
        visitors: z.union([z.string(), z.number(), z.null()]).optional(),
        referers: z.union([z.string(), z.number(), z.null()]).optional(),
      })
    )
    .default([]),
});

type SinkLinkResponse = z.infer<typeof sinkLinkResponseSchema>;

export class SinkUnavailableError extends Error {
  constructor(message = "Sink API is unavailable") {
    super(message);
    this.name = "SinkUnavailableError";
  }
}

export class SinkInvalidResponseError extends Error {
  constructor(message = "Sink API returned an invalid response") {
    super(message);
    this.name = "SinkInvalidResponseError";
  }
}

export class SinkClient {
  private static get baseUrl(): string {
    return process.env.SINK_API_BASE_URL ?? "https://rcdm.ink";
  }

  private static get token(): string {
    const token = process.env.SINK_SITE_TOKEN ?? process.env.NUXT_SITE_TOKEN;
    if (!token) {
      throw new SinkUnavailableError(
        "Missing SINK_SITE_TOKEN / NUXT_SITE_TOKEN"
      );
    }
    return token;
  }

  private static async request<T>(
    path: string,
    init: RequestInit,
    schema?: z.ZodSchema<T>
  ): Promise<T> {
    let response: Response;
    const fullUrl = `${this.baseUrl}${path}`;

    try {
      response = await fetch(fullUrl, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.token}`,
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
        },
      });
    } catch (error: any) {
      console.error("[SinkClient] Fetch error:", error);
      throw new SinkUnavailableError(error?.message);
    }

    console.log("[SinkClient] Response:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (!response.ok) {
      let errorBody = "";
      try {
        errorBody = await response.text();
      } catch {
        // ignore
      }
      throw new SinkUnavailableError(
        `Sink API request failed with HTTP ${response.status}: ${errorBody}`
      );
    }

    const payload = await response.json();

    if (!schema) {
      return payload as T;
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      console.error("[SinkClient] Schema validation failed:", parsed.error);
      throw new SinkInvalidResponseError(parsed.error.message);
    }

    return parsed.data;
  }

  static getPublicShortUrl(slug: string): string {
    const base =
      process.env.SINK_PUBLIC_BASE_URL ??
      process.env.SINK_API_BASE_URL ??
      "https://rcdm.ink";
    return `${base.replace(/\/+$/, "")}/${slug}`;
  }

  static async createLink(input: {
    url: string;
    slug?: string;
    comment?: string;
  }): Promise<SinkLinkResponse> {
    console.log("[SinkClient] Creating link:", {
      input,
      baseUrl: this.baseUrl,
    });

    const payload = await this.request<unknown>("/api/link/create", {
      method: "POST",
      body: JSON.stringify(input),
    });

    console.log("[SinkClient] Create response:", payload);

    // Try to parse the new response format with {link: {...}, shortLink: '...'}
    const createResponse = sinkCreateResponseSchema.safeParse(payload);
    if (createResponse.success) {
      // Convert to SinkLinkResponse format using data from link object
      return {
        id: createResponse.data.link.id,
        slug: createResponse.data.link.slug,
        url: createResponse.data.link.url,
        createdAt: createResponse.data.link.createdAt,
        updatedAt: createResponse.data.link.updatedAt,
      };
    }

    // Try old format
    const parsedCreated = sinkLinkResponseSchema.safeParse(payload);
    if (parsedCreated.success) {
      return parsedCreated.data;
    }

    console.error("[SinkClient] Unexpected response format:", payload);
    throw new SinkInvalidResponseError(
      "Sink API returned unexpected response format"
    );
  }

  static async queryLink(slug: string): Promise<SinkLinkResponse> {
    return this.request(
      `/api/link/query?slug=${encodeURIComponent(slug)}`,
      {
        method: "GET",
      },
      sinkLinkResponseSchema
    );
  }

  static async editLink(input: {
    slug: string;
    url?: string;
  }): Promise<SinkLinkResponse> {
    await this.request("/api/link/edit", {
      method: "PUT",
      body: JSON.stringify(input),
    });

    return this.queryLink(input.slug);
  }

  static async deleteLink(slug: string): Promise<void> {
    await this.request("/api/link/delete", {
      method: "POST",
      body: JSON.stringify({ slug }),
    });
  }

  static async getCountersBySlug(slug: string): Promise<{
    totalClicks: number;
    uniqueClicks: number;
  }> {
    const payload = await this.request(
      `/api/stats/counters?slug=${encodeURIComponent(slug)}`,
      { method: "GET" },
      sinkCountersResponseSchema
    );

    const counters = payload.data?.[0];
    return {
      totalClicks: Number(counters?.visits ?? 0) || 0,
      uniqueClicks: Number(counters?.visitors ?? 0) || 0,
    };
  }

  static async getViewsBySlug(slug: string): Promise<any> {
    return this.request(
      `/api/stats/views?slug=${encodeURIComponent(slug)}&unit=day`,
      { method: "GET" }
    );
  }

  static async getMetricsBySlug(
    slug: string,
    type: string,
    unit?: string
  ): Promise<any> {
    const unitParam = unit ? `&unit=${encodeURIComponent(unit)}` : "";
    return this.request(
      `/api/stats/metrics?slug=${encodeURIComponent(slug)}&type=${encodeURIComponent(type)}${unitParam}`,
      { method: "GET" }
    );
  }

  static async getHeatmapBySlug(slug: string): Promise<any> {
    return this.request(`/api/stats/heatmap?slug=${encodeURIComponent(slug)}`, {
      method: "GET",
    });
  }
}
