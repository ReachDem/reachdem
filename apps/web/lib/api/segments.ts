/**
 * Thin API client for the Segments REST endpoints.
 * Makes fetch calls from the browser (client components).
 * For server-side initial loads, use the server actions in app/actions/segments.ts
 */
import { SegmentNode } from "@reachdem/shared";

export interface Segment {
  id: string;
  name: string;
  description: string | null;
  definition: SegmentNode;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  _count?: { contacts: number };
}

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phoneE164: string | null;
  enterprise: string | null;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  meta: {
    total: number;
    limit: number;
    nextCursor: string | null;
  };
}

// ─── Segments CRUD ────────────────────────────────────────────────────────────

export async function listSegments(params?: {
  limit?: number;
  cursor?: string;
}): Promise<Page<Segment>> {
  const url = new URL("/api/v1/segments", window.location.origin);
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.cursor) url.searchParams.set("cursor", params.cursor);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Failed to list segments: ${res.status}`);

  const json = await res.json();
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
  name: string;
  description?: string;
  definition: SegmentNode;
}): Promise<Segment> {
  const res = await fetch("/api/v1/segments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Failed to create segment: ${res.status}`);
  }

  const segment = await res.json();
  return segment;
}

export async function getSegment(id: string): Promise<Segment> {
  const res = await fetch(`/api/v1/segments/${id}`);
  if (!res.ok) throw new Error(`Segment not found`);
  const segment = await res.json();
  return segment;
}

export async function updateSegment(
  id: string,
  data: { name?: string; description?: string; definition?: SegmentNode }
): Promise<Segment> {
  const res = await fetch(`/api/v1/segments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Failed to update segment: ${res.status}`);
  }

  const segment = await res.json();
  return segment;
}

export async function deleteSegment(id: string): Promise<void> {
  const res = await fetch(`/api/v1/segments/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Failed to delete segment: ${res.status}`);
  }
}

// ─── Segment Contacts Preview ─────────────────────────────────────────────────

export async function listSegmentContactsPreview(
  segmentId: string,
  params?: { limit?: number; cursor?: string; q?: string }
): Promise<Page<Contact>> {
  const url = new URL(
    `/api/v1/segments/${segmentId}/contacts`,
    window.location.origin
  );
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.cursor) url.searchParams.set("cursor", params.cursor);
  if (params?.q) url.searchParams.set("q", params.q);

  const res = await fetch(url.toString());
  if (!res.ok)
    throw new Error(`Failed to list segment contacts: ${res.status}`);

  const data = await res.json();
  return data; // API returns paginated contacts result structure
}

export async function evaluateSegmentContactsPreview(
  definition: SegmentNode,
  params?: { limit?: number; cursor?: string; q?: string }
): Promise<Page<Contact>> {
  const url = new URL(`/api/v1/segments/preview`, window.location.origin);
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.cursor) url.searchParams.set("cursor", params.cursor);
  if (params?.q) url.searchParams.set("q", params.q);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ definition }),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    let errorMessage = "Échec de la prévisualisation du segment";
    if (json.error === "Invalid segment definition") {
      errorMessage =
        "Certains groupes de règles sont vides ou incomplets. Veuillez ajouter des règles ou supprimer les groupes vides.";
    } else if (json.error) {
      errorMessage = json.error;
    } else {
      errorMessage += ` (Erreur ${res.status})`;
    }
    throw new Error(errorMessage);
  }

  const data = await res.json();
  return data;
}
