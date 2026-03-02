/**
 * Thin API client for the Groups REST endpoints.
 * Makes fetch calls from the browser (client components).
 * For server-side initial loads, use the server actions in app/actions/groups.ts
 */

export interface Group {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  _count?: { members: number };
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

// ─── Groups CRUD ──────────────────────────────────────────────────────────────

export async function listGroups(params?: {
  search?: string;
  limit?: number;
  cursor?: string;
}): Promise<Page<Group>> {
  const url = new URL("/api/v1/groups", window.location.origin);
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.cursor) url.searchParams.set("cursor", params.cursor);
  if (params?.search) url.searchParams.set("search", params.search);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Failed to list groups: ${res.status}`);
  return res.json();
}

export async function createGroup(data: {
  name: string;
  description?: string;
}): Promise<Group> {
  const res = await fetch("/api/v1/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (res.status === 409) {
    const json = await res.json();
    throw new Error(json.error || "A group with this name already exists.");
  }
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Failed to create group: ${res.status}`);
  }

  const json = await res.json();
  return json.data;
}

export async function getGroup(id: string): Promise<Group> {
  const res = await fetch(`/api/v1/groups/${id}`);
  if (!res.ok) throw new Error(`Group not found`);
  const json = await res.json();
  return json.data;
}

export async function updateGroup(
  id: string,
  data: { name?: string; description?: string }
): Promise<Group> {
  const res = await fetch(`/api/v1/groups/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (res.status === 409) {
    const json = await res.json();
    throw new Error(json.error || "A group with this name already exists.");
  }
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Failed to update group: ${res.status}`);
  }

  const json = await res.json();
  return json.data;
}

export async function deleteGroup(id: string): Promise<void> {
  const res = await fetch(`/api/v1/groups/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Failed to delete group: ${res.status}`);
  }
}

// ─── Group Members ─────────────────────────────────────────────────────────────

export async function listGroupContacts(
  groupId: string,
  params?: { limit?: number; cursor?: string }
): Promise<Page<Contact>> {
  const url = new URL(
    `/api/v1/groups/${groupId}/contacts`,
    window.location.origin
  );
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.cursor) url.searchParams.set("cursor", params.cursor);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Failed to list group contacts: ${res.status}`);
  return res.json();
}

export async function addGroupMembers(
  groupId: string,
  contactIds: string[]
): Promise<void> {
  const res = await fetch(`/api/v1/groups/${groupId}/contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contact_ids: contactIds }),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Failed to add members: ${res.status}`);
  }
}

export async function removeGroupMembers(
  groupId: string,
  contactIds: string[]
): Promise<void> {
  const res = await fetch(`/api/v1/groups/${groupId}/contacts`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contact_ids: contactIds }),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Failed to remove members: ${res.status}`);
  }
}

// ─── Contacts Picker ─────────────────────────────────────────────────────────

export async function listContacts(params?: {
  search?: string;
  limit?: number;
  page?: number;
}): Promise<Page<Contact>> {
  const url = new URL("/api/v1/contacts", window.location.origin);
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.page) url.searchParams.set("page", String(params.page));
  if (params?.search) url.searchParams.set("q", params.search);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Failed to list contacts: ${res.status}`);

  // The contacts API returns { data: [...], meta: { total, page, limit, totalPages } }
  // We normalise it to { items, meta } for consistency in this lib
  const json = await res.json();
  return {
    items: json.data ?? [],
    meta: {
      total: json.meta?.total ?? 0,
      limit: json.meta?.limit ?? 20,
      nextCursor: null,
    },
  };
}
