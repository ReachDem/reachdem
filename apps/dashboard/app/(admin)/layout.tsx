import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <AppSidebar email={session.email} />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
