import {
  addDays,
  formatDateKey,
  startOfDay,
} from "@/lib/founder-admin/shared/date";
import type {
  FounderAdminDateRange,
  FounderAdminDataSource,
  VisitorPoint,
} from "@/lib/founder-admin/types";

interface PostHogFetchResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

type PostHogFetch = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }
) => Promise<PostHogFetchResponse>;

export interface PostHogAdminConfig {
  host: string;
  projectId: string;
  personalApiKey: string;
  visitorEvent: string;
  fetchImplementation?: PostHogFetch;
}

export interface PostHogQueryResult<T> {
  results: T;
  isCached: boolean;
  source: FounderAdminDataSource;
}

interface PostHogRawQueryResponse<T> {
  results?: T;
  is_cached?: boolean;
  [key: string]: unknown;
}

interface PostHogUniqueVisitorRow {
  day: string;
  visitors: number;
}

export class PostHogAdminError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly details?: string
  ) {
    super(message);
    this.name = "PostHogAdminError";
  }
}

export function getPostHogAdminConfigFromEnv(): PostHogAdminConfig | null {
  const host = process.env.POSTHOG_HOST?.trim();
  const projectId = process.env.POSTHOG_PROJECT_ID?.trim();
  const personalApiKey = (
    process.env.POSTHOG_PERSONAL_API_KEY ?? process.env.POSTHOG_API_KEY
  )?.trim();

  if (!host || !projectId || !personalApiKey) {
    return null;
  }

  return {
    host: host.replace(/\/+$/, ""),
    projectId,
    personalApiKey,
    visitorEvent:
      process.env.POSTHOG_ADMIN_VISITOR_EVENT?.trim() || "$pageview",
  };
}

function quoteLiteral(value: string): string {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

function createEmptySeries(range: FounderAdminDateRange): VisitorPoint[] {
  const totalDays =
    Math.floor(
      (startOfDay(range.end).getTime() - startOfDay(range.start).getTime()) /
        (24 * 60 * 60 * 1000)
    ) + 1;

  return Array.from({ length: totalDays }, (_, index) => ({
    date: formatDateKey(addDays(range.start, index)),
    value: 0,
  }));
}

export function createPostHogAdminClient(
  config = getPostHogAdminConfigFromEnv()
) {
  if (!config) {
    throw new PostHogAdminError(
      "Missing PostHog admin configuration. Set POSTHOG_HOST, POSTHOG_PROJECT_ID and POSTHOG_PERSONAL_API_KEY."
    );
  }

  const resolvedConfig = config;
  const fetchImplementation =
    resolvedConfig.fetchImplementation ?? (globalThis.fetch as PostHogFetch);

  if (!fetchImplementation) {
    throw new PostHogAdminError("Fetch API is not available in this runtime.");
  }

  async function queryHogQL<T>(
    query: string,
    name: string
  ): Promise<PostHogQueryResult<T>> {
    const response = await fetchImplementation(
      `${resolvedConfig.host}/api/projects/${resolvedConfig.projectId}/query/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resolvedConfig.personalApiKey}`,
        },
        body: JSON.stringify({
          query: {
            kind: "HogQLQuery",
            query,
          },
          name,
        }),
      }
    );

    const bodyText = await response.text();
    let body: PostHogRawQueryResponse<T>;

    try {
      body = bodyText
        ? (JSON.parse(bodyText) as PostHogRawQueryResponse<T>)
        : {};
    } catch (error) {
      throw new PostHogAdminError(
        "PostHog returned a non-JSON response.",
        response.status,
        String(error)
      );
    }

    if (!response.ok) {
      throw new PostHogAdminError(
        "PostHog query failed.",
        response.status,
        bodyText
      );
    }

    return {
      results: (body.results ?? ([] as unknown[])) as T,
      isCached: Boolean(body.is_cached),
      source: "posthog",
    };
  }

  async function getDailyUniqueVisitors(
    range: FounderAdminDateRange
  ): Promise<PostHogQueryResult<VisitorPoint[]>> {
    const query = `
      SELECT
        toString(toDate(timestamp)) AS day,
        uniq(distinct_id) AS visitors
      FROM events
      WHERE event = ${quoteLiteral(resolvedConfig.visitorEvent)}
        AND timestamp >= toDateTime(${quoteLiteral(range.start.toISOString())})
        AND timestamp < toDateTime(${quoteLiteral(addDays(startOfDay(range.end), 1).toISOString())})
      GROUP BY day
      ORDER BY day ASC
    `;
    const response = await queryHogQL<PostHogUniqueVisitorRow[]>(
      query,
      "founder-admin daily unique visitors"
    );

    const index = new Map(
      response.results.map((row) => [row.day, Number(row.visitors ?? 0)])
    );
    const series = createEmptySeries(range).map((point) => ({
      date: point.date,
      value: index.get(point.date) ?? 0,
    }));

    return {
      ...response,
      results: series,
    };
  }

  return {
    queryHogQL,
    getDailyUniqueVisitors,
  };
}
