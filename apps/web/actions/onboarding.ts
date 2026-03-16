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
    const requestHeaders = await headers();

    const session = await auth.api.getSession({
      headers: requestHeaders,
    });

    if (!session?.user?.id) {
      return {
        error: "No authenticated user found. Please ensure you are signed up.",
      };
    }

    if (!session.user.emailVerified) {
      return {
        error: "Verify your email address before creating a workspace.",
      };
    }

    const userId = session.user.id;

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { defaultOrganizationId: true },
    });

    if (existingUser?.defaultOrganizationId) {
      if (
        session.session.activeOrganizationId !==
        existingUser.defaultOrganizationId
      ) {
        await auth.api.setActiveOrganization({
          headers: requestHeaders,
          body: {
            organizationId: existingUser.defaultOrganizationId,
          },
        });
      }

      return {
        success: true,
        organizationId: existingUser.defaultOrganizationId,
      };
    }

    const slug = await generateUniqueOrganizationSlug(
      validatedData.workspaceName
    );
    const organization = await auth.api.createOrganization({
      headers: requestHeaders,
      body: {
        name: validatedData.workspaceName,
        slug,
      },
    });

    if (!organization?.id) {
      return { error: "Failed to create your workspace." };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        role: validatedData.role,
        defaultOrganizationId: organization.id,
      },
    });

    return { success: true, organizationId: organization.id };
  } catch (error: Error | unknown) {
    console.error("Workspace setup failed:", error);
    return { error: "An unexpected error occurred during workspace setup." };
  }
}
