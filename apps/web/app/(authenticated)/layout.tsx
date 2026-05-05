import { auth } from "@reachdem/auth";
import { prisma } from "@reachdem/database";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthFlowState } from "@/lib/server/auth-flow";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { OrganizationVerificationBanner } from "@/components/shared/organization-verification-banner";
import { SiteHeader } from "@/components/layout/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TipsProvider } from "@/components/onboarding/tips-engine";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const flow = await getAuthFlowState();

  if (!flow.hasSession || !flow.session) {
    redirect("/login");
  }

  if (!flow.hasCompletedSetup) {
    redirect("/continue-setup");
  }

  const activeOrganizationId =
    flow.session?.session.activeOrganizationId ?? flow.defaultOrganizationId;

  const activeOrganization = activeOrganizationId
    ? await prisma.organization.findUnique({
        where: { id: activeOrganizationId },
        select: {
          id: true,
          name: true,
          logo: true,
          senderId: true,
          workspaceVerificationStatus: true,
        },
      })
    : null;
  const workspaceMemberships = await prisma.member.findMany({
    where: { userId: flow.session.user.id },
    orderBy: { createdAt: "asc" },
    select: {
      organization: {
        select: {
          id: true,
          name: true,
          logo: true,
        },
      },
    },
  });
  const workspaces = workspaceMemberships.map(
    (membership) => membership.organization
  );

  const showVerificationBanner = Boolean(
    activeOrganization?.senderId &&
    activeOrganization.workspaceVerificationStatus !== "verified"
  );

  return (
    <TipsProvider>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar
          variant="inset"
          initialWorkspace={activeOrganization}
          initialWorkspaces={workspaces}
        />
        <SidebarInset>
          {showVerificationBanner ? (
            <OrganizationVerificationBanner
              senderId={activeOrganization!.senderId!}
              verificationStatus={
                activeOrganization!.workspaceVerificationStatus as
                  | "not_submitted"
                  | "pending"
                  | "verified"
                  | "rejected"
              }
            />
          ) : null}
          <SiteHeader />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TipsProvider>
  );
}
