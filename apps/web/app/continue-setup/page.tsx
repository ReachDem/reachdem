import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/onboarding-wizard";
import { ContinueSetupRecovery } from "@/components/continue-setup-recovery";
import { getAuthFlowState } from "@/lib/auth-flow";

export default async function ContinueSetupPage() {
  const flow = await getAuthFlowState();

  if (!flow.hasSession || !flow.session) {
    redirect("/register");
  }

  if (flow.isReady) {
    redirect("/dashboard");
  }

  if (flow.hasCompletedSetup && !flow.hasActiveOrganization) {
    if (!flow.defaultOrganizationId) {
      redirect("/register");
    }

    return (
      <ContinueSetupRecovery organizationId={flow.defaultOrganizationId} />
    );
  }

  if (!flow.isEmailVerified) {
    return (
      <OnboardingWizard
        mode="verify-email"
        initialName={flow.session.user.name ?? ""}
        initialEmail={flow.session.user.email ?? ""}
      />
    );
  }

  return (
    <OnboardingWizard
      mode="account-setup"
      initialName={flow.session.user.name ?? ""}
      initialEmail={flow.session.user.email ?? ""}
    />
  );
}
