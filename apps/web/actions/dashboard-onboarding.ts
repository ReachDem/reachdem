"use server";

import { auth } from "@reachdem/auth";
import { prisma } from "@reachdem/database";
import { headers } from "next/headers";
import { DashboardChecklistStep } from "@reachdem/shared";

// Compute step completions
export async function getDashboardChecklistState() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const userWithState = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { onboardingState: true },
  });

  // Use the active org from session, or fall back to user's default org
  const organizationId =
    session.session.activeOrganizationId ??
    userWithState?.defaultOrganizationId ??
    null;

  if (!organizationId) {
    return { error: "No organization found" };
  }

  const state = userWithState?.onboardingState;
  const uiState = (state?.uiState as any) || {};

  if (uiState.checklistDismissed) {
    return { dismissed: true, steps: [] };
  }

  const role = state?.role || "ENTREPRENEUR";

  // Step 1: Configure a channel (Sender ID)
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { senderId: true },
  });
  const step1Done = Boolean(org?.senderId);

  // Step 2: Import contacts
  const contactsCount = await prisma.contact.count({
    where: { organizationId },
  });
  const step2Done = contactsCount > 0;

  // Step 3: Launch campaign or Copy API key
  let step3Done = false;
  if (role === "DEVELOPER") {
    // API logic - placeholder
    step3Done = Boolean(uiState?.apiKeyCopied);
  } else {
    const campaignsCount = await prisma.campaign.count({
      where: { organizationId, status: { not: "draft" } },
    });
    step3Done = campaignsCount > 0;
  }

  const steps: DashboardChecklistStep[] = [
    {
      id: "step1",
      title: "Configure a channel",
      description: "Approve your sender ID to send messages.",
      status: step1Done ? "done" : "pending",
      href: "/settings/billing", // example route
    },
    {
      id: "step2",
      title: "Import contacts",
      description: "Add your first contacts to your database.",
      status: step2Done ? "done" : "pending",
      href: "/contacts/import",
    },
    {
      id: "step3",
      title: role === "DEVELOPER" ? "Copy API key" : "Launch a campaign",
      description:
        role === "DEVELOPER"
          ? "Kick-start tests with the API."
          : "Create your first marketing campaign.",
      status: step3Done ? "done" : "pending",
      href: role === "DEVELOPER" ? "/settings/api" : "/campaigns/new",
    },
  ];

  return { dismissed: false, steps };
}

export async function dismissChecklist() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { error: "Unauthorized" };

  const state = await prisma.onboardingState.findUnique({
    where: { userId: session.user.id },
  });

  const currentUiState = (state?.uiState as any) || {};

  await prisma.onboardingState.update({
    where: { userId: session.user.id },
    data: {
      uiState: { ...currentUiState, checklistDismissed: true },
    },
  });

  return { success: true };
}

export async function markChecklistStepSeen(stepId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { error: "Unauthorized" };

  const state = await prisma.onboardingState.findUnique({
    where: { userId: session.user.id },
  });

  const currentUiState = (state?.uiState as any) || {};

  await prisma.onboardingState.update({
    where: { userId: session.user.id },
    data: {
      uiState: { ...currentUiState, lastTooltipSeen: stepId },
    },
  });

  return { success: true };
}
