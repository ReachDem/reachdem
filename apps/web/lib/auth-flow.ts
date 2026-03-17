import { auth } from "@reachdem/auth";
import { prisma } from "@reachdem/database";
import { headers } from "next/headers";

type SessionResult = Awaited<ReturnType<typeof auth.api.getSession>>;

export type AuthFlowState = {
  session: SessionResult;
  hasSession: boolean;
  isEmailVerified: boolean;
  hasCompletedSetup: boolean;
  hasActiveOrganization: boolean;
  isReady: boolean;
  defaultOrganizationId: string | null;
  nextPath: string;
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
      nextPath: "/login",
    };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { defaultOrganizationId: true },
  });

  const defaultOrganizationId = dbUser?.defaultOrganizationId ?? null;
  const isEmailVerified = Boolean(session.user.emailVerified);
  const hasCompletedSetup = Boolean(defaultOrganizationId);
  const hasActiveOrganization = Boolean(session.session.activeOrganizationId);
  const isReady = isEmailVerified && hasCompletedSetup && hasActiveOrganization;

  return {
    session,
    hasSession: true,
    isEmailVerified,
    hasCompletedSetup,
    hasActiveOrganization,
    isReady,
    defaultOrganizationId,
    nextPath: isReady ? "/dashboard" : "/continue-setup",
  };
}
