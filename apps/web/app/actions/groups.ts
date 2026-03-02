"use server";

import { prisma } from "@reachdem/database";
import { auth } from "@reachdem/auth";
import { headers } from "next/headers";

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
  return prisma.group.findMany({
    where: { organizationId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { members: true } },
    },
  });
}

export async function getGroupById(id: string) {
  const organizationId = await getOrganizationId();
  const group = await prisma.group.findFirst({
    where: { id, organizationId },
    include: { _count: { select: { members: true } } },
  });
  if (!group) throw new Error("Group not found");
  return group;
}

export async function getGroupContacts(
  groupId: string,
  opts: { limit?: number; skip?: number } = {}
) {
  const organizationId = await getOrganizationId();
  const { limit = 50, skip = 0 } = opts;

  // Verify the group belongs to this org
  const group = await prisma.group.findFirst({
    where: { id: groupId, organizationId },
  });
  if (!group) throw new Error("Group not found");

  const [total, members] = await Promise.all([
    prisma.groupMember.count({ where: { groupId } }),
    prisma.groupMember.findMany({
      where: { groupId },
      take: limit,
      skip,
      orderBy: { addedAt: "desc" },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneE164: true,
            enterprise: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  return {
    items: members.map((m) => m.contact),
    meta: { total, limit, skip },
  };
}

export async function getContactsForPicker(
  opts: {
    limit?: number;
    skip?: number;
  } = {}
) {
  const organizationId = await getOrganizationId();
  const { limit = 100, skip = 0 } = opts;

  const [total, contacts] = await Promise.all([
    prisma.contact.count({ where: { organizationId, deletedAt: null } }),
    prisma.contact.findMany({
      where: { organizationId, deletedAt: null },
      take: limit,
      skip,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        phoneE164: true,
        enterprise: true,
        createdAt: true,
      },
    }),
  ]);

  return { items: contacts, meta: { total, limit, skip } };
}
