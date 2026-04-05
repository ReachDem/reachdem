"use server";

import { auth } from "@reachdem/auth";
import { prisma } from "@reachdem/database";
import { generateUniqueOrganizationSlug } from "../lib/slugify";
import { headers } from "next/headers";
import { z } from "zod";
import { ReachDemRole, AcquisitionSource } from "@reachdem/shared";
import { getAuthFlowState } from "../lib/auth-flow";

export async function completeRegistrationConsent(data: {
  firstName: string;
  lastName: string;
}) {
  try {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });

    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const userId = session.user.id;
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
          currentStep: "verify_email", // Default start
        },
        update: {},
      });
    });

    return { success: true };
  } catch (error) {
    console.error("completeRegistrationConsent failed", error);
    return { error: "An error occurred." };
  }
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
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return { error: "Unauthorized" };

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true },
    });

    if (dbUser?.emailVerified) {
      await prisma.onboardingState.update({
        where: { userId: session.user.id },
        data: { currentStep: "workspace" },
      });
      return { success: true };
    }

    return { error: "Email not verified yet." };
  } catch (error) {
    return { error: "Failed to verify completion" };
  }
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
  try {
    const validatedData = workspaceSchema.parse(payload);
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });

    if (!session?.user?.id) return { error: "Unauthorized" };

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

    if (!organization?.id) return { error: "Failed to create workspace." };

    await prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: organization.id },
        data: {
          companyName: validatedData.companyName,
          country: validatedData.country,
        },
      });

      await tx.user.update({
        where: { id: session.user.id },
        data: { defaultOrganizationId: organization.id },
      });

      await tx.onboardingState.update({
        where: { userId: session.user.id },
        data: {
          organizationId: organization.id,
          currentStep: "profile",
          step1CompletedAt: new Date(),
        },
      });
    });

    return { success: true, organizationId: organization.id };
  } catch (error) {
    console.error(error);
    return { error: "An error occurred during creation." };
  }
}

export async function savePrimaryRole(role: ReachDemRole) {
  try {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });
    if (!session?.user?.id) return { error: "Unauthorized" };

    await prisma.onboardingState.update({
      where: { userId: session.user.id },
      data: {
        role,
        currentStep: "acquisition",
        step2CompletedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    return { error: "Error" };
  }
}

export async function saveAcquisitionSource(
  source: AcquisitionSource,
  otherText?: string
) {
  try {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });
    if (!session?.user?.id) return { error: "Unauthorized" };

    await prisma.onboardingState.update({
      where: { userId: session.user.id },
      data: {
        acquisitionSource: source,
        acquisitionOther: otherText || null,
        currentStep: "transition",
        step3CompletedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    return { error: "Error" };
  }
}

export async function completeOnboarding() {
  try {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });
    if (!session?.user?.id) return { error: "Unauthorized" };

    await prisma.onboardingState.update({
      where: { userId: session.user.id },
      data: {
        status: "completed",
        currentStep: "dashboard_checklist",
        completedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    return { error: "Error" };
  }
}

export async function resumeOnboarding() {
  const flow = await getAuthFlowState();
  return { nextPath: flow.nextPath };
}
