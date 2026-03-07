"use server";

import { auth } from "@reachdem/auth";
import { headers } from "next/headers";
import { SegmentService, ContactFieldService } from "@reachdem/core";

async function getOrganizationId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) throw new Error("Unauthorized");
  const organizationId = session.session?.activeOrganizationId;
  if (!organizationId) throw new Error("Organization selection required");
  return organizationId;
}

export async function getSegments() {
  const organizationId = await getOrganizationId();
  // We fetch a decent amount of segments for the initial list
  const result = await SegmentService.getSegments(organizationId, {
    limit: 100,
  });
  return result.items;
}

export async function getSegmentById(id: string) {
  const organizationId = await getOrganizationId();
  return SegmentService.getSegmentById(organizationId, id);
}

export async function getContactFieldDefinitions() {
  const organizationId = await getOrganizationId();
  const fields = await ContactFieldService.getContactFields(organizationId);
  return fields.map((f) => ({ key: f.key, label: f.label, type: f.type }));
}
