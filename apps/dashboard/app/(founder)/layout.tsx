import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/founder-admin/auth";
import { FounderSidebar } from "@/components/founder-admin/sidebar";
import { FounderHeader } from "@/components/founder-admin/header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default async function FounderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <FounderSidebar variant="inset" email={session.email} />
      <SidebarInset>
        <FounderHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
