import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getAuthFlowState } from "@/lib/auth-flow";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const flow = await getAuthFlowState();

  if (!flow.hasSession) {
    redirect("/login");
  }

  if (!flow.isReady) {
    redirect("/continue-setup");
  }

  return (
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
  );
}
