import { requireOrgMembership, getActiveOrganization } from "@reachdem/auth";
import { MemberList } from "./_components/member-list";
import { LogoUpdate } from "./_components/logo-update";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardDescription,
  SettingsCardFooter,
  SettingsCardHeader,
  SettingsCardTitle,
} from "@/components/settings-card";
import { DeleteOrganizationButton } from "./_components/delete-organization-button";

export default async function WorkspaceSettingsPage() {
  const { session, member } = await requireOrgMembership();
  const org = await getActiveOrganization();

  if (!org) {
    return <div>No active organization found.</div>;
  }

  // @ts-ignore - Better Auth returns members as part of getFullOrganization
  const members = org.members || [];

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER SECTION */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Workspace Settings
        </h2>
        <p className="text-muted-foreground mt-1">
          Manage your organization, team members, and subscription.
        </p>
      </div>

      {/* Organization Details Section */}
      <SettingsCard>
        <SettingsCardHeader>
          <SettingsCardTitle>Organization Details</SettingsCardTitle>
          <SettingsCardDescription>
            Basic information about your organization and its branding.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent className="pt-6">
          <div className="max-w-2xl space-y-8">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <div className="flex gap-2">
                <Input
                  defaultValue={org.name}
                  readOnly
                  className="bg-muted/50"
                  placeholder="Organization Name"
                />
                <Button variant="outline" className="shrink-0">
                  Request Change
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Slug</label>
              <div className="flex gap-2">
                <Input
                  defaultValue={org.slug}
                  readOnly
                  className="bg-muted/50"
                  placeholder="organization-slug"
                />
                <Button variant="outline" className="shrink-0">
                  Request Change
                </Button>
              </div>
            </div>

            <div className="border-muted flex items-center justify-between border-t pt-4">
              <div className="space-y-1">
                <h4 className="font-medium">Update the Logo</h4>
                <p className="text-muted-foreground text-sm">
                  The visual identity of your team.
                </p>
              </div>
              <LogoUpdate initialLogo={org.logo} orgId={org.id} />
            </div>
          </div>
        </SettingsCardContent>
      </SettingsCard>

      {/* Members Section */}
      <SettingsCard>
        <SettingsCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1.5">
            <SettingsCardTitle>Members</SettingsCardTitle>
            <SettingsCardDescription>
              Manage who has access to this workspace.
            </SettingsCardDescription>
          </div>
          <Button variant="outline">Invite Member</Button>
        </SettingsCardHeader>
        <SettingsCardContent className="pt-6">
          <MemberList members={members} />
        </SettingsCardContent>
      </SettingsCard>

      {/* Plan Section */}
      <SettingsCard>
        <SettingsCardHeader>
          <SettingsCardTitle>Plan</SettingsCardTitle>
          <SettingsCardDescription>
            Your current subscription plan and billing.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent className="pt-6">
          <div className="bg-muted/20 flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <p className="text-sm leading-none font-medium">Current Plan</p>
              <p className="text-muted-foreground text-sm">Base Tier</p>
            </div>
            <Button className="bg-[#f58220] text-white hover:bg-[#d6701a]">
              Upgrade Plan
            </Button>
          </div>
        </SettingsCardContent>
      </SettingsCard>

      {/* Credits Section */}
      <SettingsCard>
        <SettingsCardHeader>
          <SettingsCardTitle>Credits</SettingsCardTitle>
          <SettingsCardDescription>
            Available credits for usage-based features.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent className="pt-6">
          <div className="bg-muted/20 flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <p className="text-sm leading-none font-medium">Credit Balance</p>
              <p className="text-muted-foreground text-sm">
                Used for premium actions
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-[#f58220] px-4 py-1.5 text-sm font-medium text-white">
              30,294 Credits
            </span>
          </div>
        </SettingsCardContent>
      </SettingsCard>

      {/* Danger Zone */}
      <SettingsCard className="border-red-500/20">
        <SettingsCardHeader>
          <SettingsCardTitle className="text-red-600">
            Danger Zone
          </SettingsCardTitle>
          <SettingsCardDescription>
            Irreversible actions for this organization.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm leading-none font-medium">
                Delete Organization
              </p>
              <p className="text-muted-foreground text-sm">
                Permanently remove your organization and all of its contents
                from our platform. This action is not reversible.
              </p>
            </div>
            <DeleteOrganizationButton organizationId={org.id} />
          </div>
        </SettingsCardContent>
      </SettingsCard>
    </div>
  );
}
