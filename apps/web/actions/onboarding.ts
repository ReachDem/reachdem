"use server";

import { auth } from "@reachdem/auth";
import { ensureDefaultApiKeyForOrganization } from "@reachdem/auth/api-key";
import { prisma } from "@reachdem/database";
import { generateUniqueOrganizationSlug } from "../lib/slugify";
import { headers } from "next/headers";
import { z } from "zod";
import { ReachDemRole, AcquisitionSource } from "@reachdem/shared";
import { PlatformBillingSettingsService } from "@reachdem/core";
import { getAuthFlowState } from "../lib/auth-flow";

// Helper partagé pour récupérer la session et les headers
async function requireAuthSession() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return { user: session.user, reqHeaders };
}

async function withAuthAction<T>(
  action: (context: {
    user: { id: string; emailVerified: boolean };
    reqHeaders: Headers;
  }) => Promise<T>
): Promise<T | { error: string; success?: false }> {
  try {
    const context = await requireAuthSession();
    return await action(context);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return { error: "Unauthorized", success: false };
    }
    console.error("Action error:", error);
    return { error: "An error occurred.", success: false };
  }
}

const legacyBootstrapSchema = z.object({
  workspaceName: z.string().min(1, "Workspace name is required"),
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

function mapLegacyRoleToReachDemRole(
  role: z.infer<typeof legacyBootstrapSchema>["role"]
): ReachDemRole {
  switch (role) {
    case "Software Engineer":
      return "DEVELOPER";
    case "Sales":
      return "SALES";
    case "Marketing":
      return "MARKETER";
    case "Founder":
    case "Product Manager":
    case "Designer":
    case "Other":
    default:
      return "ENTREPRENEUR";
  }
}

export async function completeRegistrationConsent(data: {
  firstName: string;
  lastName: string;
}) {
  return withAuthAction(async ({ user }) => {
    const userId = user.id;
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          termsAcceptedAt: now,
          privacyAcceptedAt: now,
        },
      });

      await tx.onboardingState.upsert({
        where: { userId },
        create: {
          userId,
          currentStep: user.emailVerified ? "workspace" : "verify_email", // Skip OTP if already verified via Google
        },
        update: {},
      });
    });

    return { success: true };
  });
}

export async function sendVerificationOtp(email: string) {
  try {
    await auth.api.sendVerificationOTP({
      headers: await headers(),
      body: {
        email,
        type: "email-verification",
      },
    });

    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Impossible d'envoyer le code de verification." };
  }
}

// verifyOtp is usually client-side using authClient.emailOtp.verifyEmail.
// But here is a wrapper if needed specifically for onboarding state transition
export async function verifyOtpCompletion() {
  return withAuthAction(async ({ user }) => {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { emailVerified: true },
    });

    if (dbUser?.emailVerified) {
      await prisma.onboardingState.upsert({
        where: { userId: user.id },
        update: { currentStep: "workspace" },
        create: {
          userId: user.id,
          currentStep: "workspace",
        },
      });
      return { success: true };
    }

    return { error: "Email not verified yet." };
  });
}

export async function resendVerificationLink(email: string) {
  try {
    await auth.api.sendVerificationEmail({
      headers: await headers(),
      body: {
        email,
        callbackURL: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/verify-email`,
      },
    });

    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Impossible d'envoyer le lien de verification." };
  }
}

const workspaceSchema = z.object({
  companyName: z.string().min(1, "Required"),
  workspaceName: z.string().min(1, "Required"),
  country: z.string().min(1, "Required"),
});

export async function createWorkspace(
  payload: z.infer<typeof workspaceSchema>
) {
  return withAuthAction(async ({ user, reqHeaders }) => {
    const validatedData = workspaceSchema.parse(payload);

    const slug = await generateUniqueOrganizationSlug(
      validatedData.workspaceName
    );
    const organization = await auth.api.createOrganization({
      headers: reqHeaders,
      body: {
        name: validatedData.workspaceName,
        slug,
      },
    });

    if (!organization?.id) return { error: "Failed to create workspace." };

    await prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: organization.id },
        data: {
          companyName: validatedData.companyName,
          country: validatedData.country,
          creditBalance:
            await PlatformBillingSettingsService.getInitialWorkspaceBalanceMinor(),
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { defaultOrganizationId: organization.id },
      });

      await tx.onboardingState.upsert({
        where: { userId: user.id },
        update: {
          organizationId: organization.id,
          currentStep: "profile",
          step1CompletedAt: new Date(),
        },
        create: {
          userId: user.id,
          organizationId: organization.id,
          currentStep: "profile",
          step1CompletedAt: new Date(),
        },
      });
    });

    try {
      await ensureDefaultApiKeyForOrganization({
        organizationId: organization.id,
        createdBy: user.id,
      });
    } catch (apiKeyError) {
      console.error(
        "[createWorkspace] Failed to provision default API key",
        apiKeyError
      );
    }

    return { success: true, organizationId: organization.id };
  });
}

export async function savePrimaryRole(role: ReachDemRole) {
  return withAuthAction(async ({ user }) => {
    await prisma.onboardingState.upsert({
      where: { userId: user.id },
      update: {
        role,
        currentStep: "acquisition",
        step2CompletedAt: new Date(),
      },
      create: {
        userId: user.id,
        role,
        currentStep: "acquisition",
        step2CompletedAt: new Date(),
      },
    });

    return { success: true };
  });
}

export async function saveAcquisitionSource(
  source: AcquisitionSource,
  otherText?: string
) {
  return withAuthAction(async ({ user }) => {
    await prisma.onboardingState.upsert({
      where: { userId: user.id },
      update: {
        acquisitionSource: source,
        acquisitionOther: otherText || null,
        currentStep: "transition",
        step3CompletedAt: new Date(),
      },
      create: {
        userId: user.id,
        acquisitionSource: source,
        acquisitionOther: otherText || null,
        currentStep: "transition",
        step3CompletedAt: new Date(),
      },
    });

    return { success: true };
  });
}

export async function completeOnboarding() {
  return withAuthAction(async ({ user }) => {
    await prisma.onboardingState.upsert({
      where: { userId: user.id },
      update: {
        status: "completed",
        currentStep: "dashboard_checklist",
        completedAt: new Date(),
      },
      create: {
        userId: user.id,
        status: "completed",
        currentStep: "dashboard_checklist",
        completedAt: new Date(),
      },
    });

    return { success: true };
  });
}

export async function resumeOnboarding() {
  const flow = await getAuthFlowState();
  return { nextPath: flow.nextPath };
}

export async function bootstrapWorkspace(
  payload: z.infer<typeof legacyBootstrapSchema>
) {
  try {
    const validatedData = legacyBootstrapSchema.parse(payload);

    // 1. Create Workspace
    const workspaceResult = await createWorkspace({
      companyName: validatedData.workspaceName,
      workspaceName: validatedData.workspaceName,
      country: "Cameroon",
    });
    if ("error" in workspaceResult) return { error: workspaceResult.error };

    // 2. Save Role
    const roleResult = await savePrimaryRole(
      mapLegacyRoleToReachDemRole(validatedData.role)
    );
    if ("error" in roleResult) return { error: roleResult.error };

    // 3. Complete Onboarding
    const completionResult = await completeOnboarding();
    if ("error" in completionResult) return { error: completionResult.error };

    return {
      success: true,
      organizationId:
        "organizationId" in workspaceResult
          ? workspaceResult.organizationId
          : undefined,
    };
  } catch (error) {
    console.error("bootstrapWorkspace failed", error);
    return { error: "Unable to finish workspace setup." };
  }
}
