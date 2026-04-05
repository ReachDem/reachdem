import { auth } from "@reachdem/auth";
import { prisma } from "@reachdem/database";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthFlowState } from "@/lib/auth-flow";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
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
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TipsProvider>
  );
}
