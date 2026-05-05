import { auth } from "@reachdem/auth";
import { prisma } from "@reachdem/database";
import { headers } from "next/headers";
import { OnboardingCurrentStep, OnboardingStateDTO } from "@reachdem/shared";

type SessionResult = Awaited<ReturnType<typeof auth.api.getSession>>;

export type AuthFlowState = {
  session: SessionResult;
  hasSession: boolean;
  isEmailVerified: boolean;
  hasCompletedSetup: boolean;
  hasActiveOrganization: boolean;
  isReady: boolean;
  defaultOrganizationId: string | null;
  nextStep: OnboardingCurrentStep;
  nextPath: string; // derived from nextStep
  onboardingState: OnboardingStateDTO | null;
};

const STEP_TO_PATH: Record<
  Exclude<OnboardingCurrentStep, "register" | "verify_email">,
  string
> = {
  workspace: "/setup/workspace",
  profile: "/setup/profile",
  acquisition: "/setup/acquisition",
  transition: "/setup/transition",
  dashboard_checklist: "/dashboard",
};

function determineNextStep(
  isEmailVerified: boolean,
  onboardingState: OnboardingStateDTO | null,
  defaultOrganizationId: string | null
): OnboardingCurrentStep {
  if (!isEmailVerified) {
    return "verify_email";
  }

  if (!onboardingState) {
    // Legacy user fallback
    return defaultOrganizationId ? "dashboard_checklist" : "workspace";
  }

  if (onboardingState.status === "completed") {
    return "dashboard_checklist";
  }

  const currentStep = onboardingState.currentStep;
  if (currentStep === "verify_email" && isEmailVerified) {
    return "workspace";
  }

  return currentStep || "workspace";
}

function determineNextPath(nextStep: OnboardingCurrentStep): string {
  if (nextStep === "register") return "/register";
  if (nextStep === "verify_email") return "/verify-email";
  return (
    STEP_TO_PATH[
      nextStep as Exclude<OnboardingCurrentStep, "register" | "verify_email">
    ] || "/dashboard"
  );
}

export async function getAuthFlowState(): Promise<AuthFlowState> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return {
      session: null,
      hasSession: false,
      isEmailVerified: false,
      hasCompletedSetup: false,
      hasActiveOrganization: false,
      isReady: false,
      defaultOrganizationId: null,
      nextStep: "register",
      nextPath: "/login",
      onboardingState: null,
    };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { onboardingState: true },
  });

  const defaultOrganizationId = dbUser?.defaultOrganizationId ?? null;
  const isEmailVerified = Boolean(session.user.emailVerified);
  const onboardingState = dbUser?.onboardingState as OnboardingStateDTO | null;

  const nextStep = determineNextStep(
    isEmailVerified,
    onboardingState,
    defaultOrganizationId
  );
  const nextPath = determineNextPath(nextStep);

  const isReady = nextStep === "dashboard_checklist";

  return {
    session,
    hasSession: true,
    isEmailVerified,
    hasCompletedSetup: isReady,
    hasActiveOrganization: Boolean(session.session?.activeOrganizationId),
    isReady,
    defaultOrganizationId,
    nextStep,
    nextPath,
    onboardingState,
  };
}
