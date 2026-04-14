import { requireOrgMembership, getActiveOrganization } from "@reachdem/auth";
import { WorkspaceBillingService } from "@reachdem/core";
import { BillingWorkspacePanel } from "../settings/workspace/_components/billing-workspace-panel";

export default async function BillingPage() {
  const { member } = await requireOrgMembership();
  const org = await getActiveOrganization();

  if (!org) {
    return <div>No active organization found.</div>;
  }

  const billing = await WorkspaceBillingService.getSummary(org.id);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-8">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">
          Plans & Credits
        </h2>
        <p className="text-muted-foreground mt-2">
          Manage your usage, plan limits, and shared message balance.
        </p>
      </div>

      <BillingWorkspacePanel billing={billing} />
    </div>
  );
}
