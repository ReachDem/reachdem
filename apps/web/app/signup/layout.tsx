import { auth } from "@reachdem/auth";
import { prisma } from "@reachdem/database";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    // Check if user has already completed onboarding
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { defaultOrganizationId: true },
    });

    if (dbUser?.defaultOrganizationId) {
      redirect("/dashboard");
    }
  }

  return <>{children}</>;
}
