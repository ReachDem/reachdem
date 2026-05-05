"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@reachdem/auth";
import { headers } from "next/headers";
import { prisma } from "@reachdem/database";

export async function updateOrganizationName(orgId: string, name: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { error: "Unauthorized" };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Name cannot be empty." };
  if (trimmed.length > 100)
    return { error: "Name is too long (max 100 characters)." };

  // Verify the caller is an owner/admin of this org
  const member = await prisma.member.findFirst({
    where: {
      organizationId: orgId,
      userId: session.user.id,
      role: { in: ["owner", "admin"] },
    },
    select: { id: true },
  });

  if (!member)
    return { error: "You don't have permission to update this organization." };

  await prisma.organization.update({
    where: { id: orgId },
    data: { name: trimmed },
  });

  revalidatePath("/settings/workspace");
  return { success: true };
}
