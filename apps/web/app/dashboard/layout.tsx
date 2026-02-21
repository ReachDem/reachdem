import { auth } from "@reachdem/auth";
import { prisma } from "@reachdem/database";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Check if user has completed onboarding
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { defaultOrganizationId: true },
  });

  if (!dbUser?.defaultOrganizationId) {
    redirect("/signup");
  }

  return <>{children}</>;
}
