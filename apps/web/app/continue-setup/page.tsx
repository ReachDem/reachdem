import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/onboarding-wizard";
import { ContinueSetupRecovery } from "@/components/shared/continue-setup-recovery";
import { getAuthFlowState } from "@/lib/server/auth-flow";

export default async function ContinueSetupPage() {
  const flow = await getAuthFlowState();

  if (!flow.hasSession || !flow.session) {
    redirect("/login");
  }

  if (flow.hasCompletedSetup && !flow.hasActiveOrganization) {
    if (!flow.defaultOrganizationId) {
      redirect("/login");
    }

    return (
      <ContinueSetupRecovery organizationId={flow.defaultOrganizationId} />
    );
  }

  if (flow.nextPath && flow.nextPath !== "/continue-setup") {
    redirect(flow.nextPath);
  }

  redirect("/dashboard");
}
