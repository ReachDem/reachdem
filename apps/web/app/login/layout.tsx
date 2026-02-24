import { auth } from "@reachdem/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@reachdem/database";

export default async function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { defaultOrganizationId: true },
    });

    if (dbUser?.defaultOrganizationId) {
      redirect("/dashboard");
    } else {
      redirect("/signup");
    }
  }

  return <>{children}</>;
}
