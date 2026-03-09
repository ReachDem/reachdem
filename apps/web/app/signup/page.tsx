import { OnboardingWizard } from "@/components/onboarding-wizard";
import { auth } from "@reachdem/auth";
import { prisma } from "@reachdem/database";
import { headers } from "next/headers";

export default async function SignupPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return <OnboardingWizard />;
  }

  const googleAccount = await prisma.account.findFirst({
    where: {
      userId: session.user.id,
      providerId: "google",
    },
    select: { id: true },
  });

  if (!googleAccount) {
    return <OnboardingWizard />;
  }

  return (
    <OnboardingWizard
      mode="social-onboarding"
      initialName={session.user.name ?? ""}
      initialEmail={session.user.email ?? ""}
    />
  );
}
