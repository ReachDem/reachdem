"use server";

import { auth } from "@reachdem/auth";
import { headers } from "next/headers";
import {
  GroupService,
  GroupMemberService,
  ContactService,
} from "@reachdem/core";

async function getOrganizationId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) throw new Error("Unauthorized");
  const organizationId = session.session?.activeOrganizationId;
  if (!organizationId) throw new Error("Organization selection required");
  return organizationId;
}

export async function getGroups() {
  const organizationId = await getOrganizationId();
  const result = await GroupService.getGroups(organizationId, { limit: 100 });
  return result.data;
}

export async function getGroupById(id: string) {
  const organizationId = await getOrganizationId();
  try {
    return await GroupService.getGroupById(id, organizationId);
  } catch {
    return null;
  }
}

export async function getGroupContacts(
  groupId: string,
  opts: { limit?: number; cursor?: string | null } = {}
) {
  const organizationId = await getOrganizationId();
  return GroupMemberService.getGroupContacts(groupId, organizationId, {
    limit: opts.limit ?? 50,
    cursor: opts.cursor,
  });
}

export async function getContactsForPicker(
  opts: { limit?: number; page?: number } = {}
) {
  const organizationId = await getOrganizationId();
  const { limit = 100, page = 1 } = opts;
  const result = await ContactService.getContacts(organizationId, {
    page,
    limit,
  });
  return { items: result.data, meta: result.meta };
}
