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

  let nextStep: OnboardingCurrentStep;

  if (!isEmailVerified) {
    nextStep = "verify_email";
  } else if (!onboardingState) {
    // Legacy user fallback: If user has defaultOrganizationId but no OnboardingState, treat as completed
    if (defaultOrganizationId) {
      nextStep = "dashboard_checklist";
    } else {
      nextStep = "workspace";
    }
  } else if (onboardingState.status === "completed") {
    nextStep = "dashboard_checklist";
  } else {
    // Rely on currentStep from OnboardingState if valid, or derive from status
    nextStep = onboardingState.currentStep || "workspace";
  }

  // derive nextPath from nextStep
  let nextPath = "/continue-setup";
  if (nextStep === "register") {
    nextPath = "/register";
  } else if (nextStep === "verify_email") {
    nextPath = "/verify-email";
  } else {
    nextPath = STEP_TO_PATH[nextStep] || "/dashboard";
  }

  const hasCompletedSetup = nextStep === "dashboard_checklist";
  const hasActiveOrganization = Boolean(session.session?.activeOrganizationId);
  const isReady = nextStep === "dashboard_checklist";

  return {
    session,
    hasSession: true,
    isEmailVerified,
    hasCompletedSetup,
    hasActiveOrganization,
    isReady,
    defaultOrganizationId,
    nextStep,
    nextPath,
    onboardingState,
  };
}
