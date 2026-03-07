"use server";

import { auth } from "@reachdem/auth";
import { prisma } from "@reachdem/database";
import { generateUniqueOrganizationSlug } from "../lib/slugify";
import { headers } from "next/headers";
import { z } from "zod";

const workspaceSchema = z.object({
  workspaceName: z.string().min(2),
  role: z.enum([
    "Software Engineer",
    "Product Manager",
    "Designer",
    "Founder",
    "Sales",
    "Marketing",
    "Other",
  ]),
});

export type WorkspacePayload = z.infer<typeof workspaceSchema>;

export async function bootstrapWorkspace(payload: WorkspacePayload) {
  try {
    const validatedData = workspaceSchema.parse(payload);

    // 1. Get the authenticated user (created by the client-side signUp)
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return {
        error: "No authenticated user found. Please ensure you are signed up.",
      };
    }

    const userId = session.user.id;

    // 2. Idempotency guard – prevent duplicate orgs / DoS via repeated calls
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { defaultOrganizationId: true },
    });

    if (existingUser?.defaultOrganizationId) {
      return { success: true }; // already onboarded, treat as no-op
    }

    // 3. Transact: Create Organization, Membership, Update User
    const slug = await generateUniqueOrganizationSlug(
      validatedData.workspaceName
    );
    const orgId = crypto.randomUUID();
    const memberId = crypto.randomUUID();

    await prisma.$transaction([
      prisma.organization.create({
        data: {
          id: orgId,
          name: validatedData.workspaceName,
          slug,
        },
      }),
      prisma.member.create({
        data: {
          id: memberId,
          organizationId: orgId,
          userId: userId,
          role: "owner",
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          role: validatedData.role,
          defaultOrganizationId: orgId,
        },
      }),
    ]);

    // Return success, the client will then redirect
    return { success: true };
  } catch (error: Error | unknown) {
    console.error("Workspace setup failed:", error);
    return { error: "An unexpected error occurred during workspace setup." };
  }
}
