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

const sinkCountersResponseSchema = z.object({
  data: z
    .array(
      z.object({
        visits: z.union([z.string(), z.number()]).optional(),
        visitors: z.union([z.string(), z.number()]).optional(),
        referers: z.union([z.string(), z.number()]).optional(),
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

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.token}`,
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
        },
      });
    } catch (error: any) {
      throw new SinkUnavailableError(error?.message);
    }

    if (!response.ok) {
      throw new SinkUnavailableError(
        `Sink API request failed with HTTP ${response.status}`
      );
    }

    const payload = await response.json();
    if (!schema) {
      return payload as T;
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new SinkInvalidResponseError(parsed.error.message);
    }

    return parsed.data;
  }

  private static async requestJson(
    path: string,
    init: RequestInit
  ): Promise<unknown> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.token}`,
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
        },
      });
    } catch (error: any) {
      throw new SinkUnavailableError(error?.message);
    }

    if (!response.ok) {
      throw new SinkUnavailableError(
        `Sink API request failed with HTTP ${response.status}`
      );
    }

    return response.json();
  }

  static async createLink(input: {
    url: string;
    slug?: string;
    comment?: string;
  }): Promise<SinkLinkResponse> {
    const payload = await this.requestJson("/api/link/create", {
      method: "POST",
      body: JSON.stringify(input),
    });

    const parsedCreated = sinkLinkResponseSchema.safeParse(payload);
    if (parsedCreated.success) {
      return parsedCreated.data;
    }

    const createdSlug =
      typeof payload === "object" &&
      payload !== null &&
      "slug" in payload &&
      typeof (payload as { slug?: unknown }).slug === "string"
        ? (payload as { slug: string }).slug
        : input.slug;

    const slug = createdSlug;
    if (!slug) {
      throw new SinkInvalidResponseError(
        "Sink create response must be followed by query, but no slug was provided"
      );
    }

    return this.queryLink(slug);
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
      totalClicks: Number(counters?.visits ?? 0),
      uniqueClicks: Number(counters?.visitors ?? 0),
    };
  }
}
