/**
 * Thin API client for the Segments REST endpoints.
 * Makes fetch calls from the browser (client components).
 * For server-side initial loads, use the server actions in app/actions/segments.ts
 */
import { SegmentNode } from "@reachdem/shared";
import {
  CursorValue,
  SearchQuery,
  IsoDateString,
  ApiEndpointPath,
  ApiUrl,
  ErrorMessage,
  Page,
} from "./common-types";

export type SegmentId = string;
export type SegmentName = string;
export type SegmentDescription = string;
export type OrganizationId = string;
export type ContactId = string;
export type ContactName = string;
export type EmailAddress = string;
export type PhoneNumber = string;
export type EnterpriseName = string;

export interface Segment {
  id: SegmentId;
  name: SegmentName;
  description: SegmentDescription | null;
  definition: SegmentNode;
  organizationId: OrganizationId;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  _count?: { contacts: number };
}

export interface Contact {
  id: ContactId;
  name: ContactName;
  email: EmailAddress | null;
  phoneE164: PhoneNumber | null;
  enterprise: EnterpriseName | null;
  createdAt: IsoDateString;
}

// ─── Segments CRUD ────────────────────────────────────────────────────────────

function buildUrl(
  pathname: ApiEndpointPath,
  params?: {
    limit?: number;
    cursor?: CursorValue;
    q?: SearchQuery;
  }
): ApiUrl {
  const url = new URL(pathname, window.location.origin);
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.cursor) url.searchParams.set("cursor", params.cursor);
  if (params?.q) url.searchParams.set("q", params.q);
  return url.toString();
}

function buildSegmentsUrl(params?: {
  limit?: number;
  cursor?: CursorValue;
}): ApiUrl {
  return buildUrl("/api/v1/segments", params);
}

async function handleJsonError(res: Response): Promise<ErrorMessage> {
  const json = await res.json().catch(() => ({}));
  return json.error || "";
}

async function handleFetchError(
  res: Response,
  defaultMessage: ErrorMessage
): Promise<never> {
  const errorMsg = await handleJsonError(res);
  throw new Error(errorMsg || `${defaultMessage} (Error ${res.status})`);
}

async function checkResponse(
  res: Response,
  defaultMessage: ErrorMessage
): Promise<void> {
  if (!res.ok) {
    await handleFetchError(res, defaultMessage);
  }
}

async function fetchJsonWithErrorHandling<T>(
  url: ApiUrl | ApiEndpointPath,
  options: RequestInit,
  errorMessage: ErrorMessage
): Promise<T> {
  const res = await fetch(url, options);
  await checkResponse(res, errorMessage);
  return res.json();
}

async function fetchMutationWithErrorHandling<T>(
  url: ApiUrl | ApiEndpointPath,
  method: "POST" | "PATCH" | "PUT",
  data: unknown,
  errorMessage: ErrorMessage
): Promise<T> {
  return fetchJsonWithErrorHandling(
    url,
    {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    errorMessage
  );
}

async function fetchVoidWithErrorHandling(
  url: ApiUrl | ApiEndpointPath,
  options: RequestInit,
  errorMessage: ErrorMessage
): Promise<void> {
  const res = await fetch(url, options);
  await checkResponse(res, errorMessage);
}

export async function listSegments(params?: {
  limit?: number;
  cursor?: CursorValue;
}): Promise<Page<Segment>> {
  const json = await fetchJsonWithErrorHandling<{
    items?: Segment[];
    meta?: { total?: number; limit?: number; nextCursor?: CursorValue | null };
  }>(buildSegmentsUrl(params), { method: "GET" }, "Failed to list segments");

  return {
    items: json.items ?? [],
    meta: {
      total: json.meta?.total ?? 0,
      limit: json.meta?.limit ?? 50,
      nextCursor: json.meta?.nextCursor ?? null,
    },
  };
}

export async function createSegment(data: {
  name: SegmentName;
  description?: SegmentDescription;
  definition: SegmentNode;
}): Promise<Segment> {
  return fetchMutationWithErrorHandling(
    "/api/v1/segments",
    "POST",
    data,
    "Failed to create segment"
  );
}

export async function getSegment(id: SegmentId): Promise<Segment> {
  return fetchJsonWithErrorHandling(
    `/api/v1/segments/${id}`,
    { method: "GET" },
    `Segment not found`
  );
}

export async function updateSegment(
  id: SegmentId,
  data: {
    name?: SegmentName;
    description?: SegmentDescription;
    definition?: SegmentNode;
  }
): Promise<Segment> {
  return fetchMutationWithErrorHandling(
    `/api/v1/segments/${id}`,
    "PATCH",
    data,
    "Failed to update segment"
  );
}

export async function deleteSegment(id: SegmentId): Promise<void> {
  return fetchVoidWithErrorHandling(
    `/api/v1/segments/${id}`,
    { method: "DELETE" },
    "Failed to delete segment"
  );
}

// ─── Segment Contacts Preview ─────────────────────────────────────────────────

export async function listSegmentContactsPreview(
  segmentId: SegmentId,
  params?: { limit?: number; cursor?: CursorValue; q?: SearchQuery }
): Promise<Page<Contact>> {
  const url = buildUrl(`/api/v1/segments/${segmentId}/contacts`, params);
  return fetchJsonWithErrorHandling<Page<Contact>>(
    url,
    { method: "GET" },
    "Failed to list segment contacts"
  );
}

export async function evaluateSegmentContactsPreview(
  definition: SegmentNode,
  params?: { limit?: number; cursor?: CursorValue; q?: SearchQuery }
): Promise<Page<Contact>> {
  const url = buildUrl(`/api/v1/segments/preview`, params);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ definition }),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    let errorMessage = "Failed to preview segment";
    if (json.error === "Invalid segment definition") {
      errorMessage =
        "Some rule groups are empty or incomplete. Please add rules or remove empty groups.";
    } else if (json.error) {
      errorMessage = json.error;
    } else {
      errorMessage += ` (Error ${res.status})`;
    }
    throw new Error(errorMessage);
  }

  const data = await res.json();
  return data;
}
