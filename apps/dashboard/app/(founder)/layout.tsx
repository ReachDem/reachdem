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
      <div className="founder-admin flex min-h-svh w-full">
        <a href="#founder-main" className="skip-link">
          Skip to Main Content
        </a>
        <FounderSidebar variant="inset" email={session.email} />
        <SidebarInset
          id="founder-main"
          tabIndex={-1}
          className="bg-transparent outline-none md:rounded-[28px] md:border md:border-white/8 md:shadow-[0_24px_100px_rgba(0,0,0,0.24)]"
        >
          <FounderHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col">
              <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 px-4 py-4 md:gap-8 md:px-6 md:py-6 xl:px-8">
                {children}
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
