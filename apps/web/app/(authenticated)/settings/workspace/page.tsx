import { requireOrgMembership, getActiveOrganization } from "@reachdem/auth";
import { prisma } from "@reachdem/database";
import { MemberList } from "./_components/member-list";
import { LogoUpdate } from "./_components/logo-update";
import { KybDialog } from "./_components/kyb-dialog";
import { SenderIdSettingsButton } from "./_components/sender-id-settings-button";
import { OrgNameForm } from "./_components/org-name-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardDescription,
  SettingsCardHeader,
  SettingsCardTitle,
} from "@/components/settings-card";
import { DeleteOrganizationButton } from "./_components/delete-organization-button";
import {
  AlertTriangle,
  BadgeCheck,
  Clock3,
  ShieldCheck,
  XCircle,
} from "lucide-react";

const verificationCopy = {
  not_submitted: {
    badgeClassName: "border-muted text-muted-foreground",
    badgeLabel: "Not submitted",
    icon: ShieldCheck,
    iconClassName: "text-muted-foreground",
    title: "Workspace verification required",
    description:
      "Submit your business details and documents to unlock sender ID approval and the rest of the setup flow.",
    actionLabel: "Submit Documents",
  },
  pending: {
    badgeClassName: "text-amber-600 dark:text-amber-400",
    badgeLabel: "Pending review",
    icon: Clock3,
    iconClassName: "text-muted-foreground",
    title: "Verification under review",
    description:
      "Your documents have been received. Our compliance team is reviewing them before activating the workspace.",
    actionLabel: "Review in Progress",
  },
  verified: {
    badgeClassName: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
    badgeLabel: "Verified",
    icon: BadgeCheck,
    iconClassName: "text-emerald-500",
    title: "Workspace verified",
    description:
      "Your business has been verified. You can now continue with sender ID setup and the rest of onboarding.",
    actionLabel: "Verified",
  },
  rejected: {
    badgeClassName: "border-red-500/30 bg-red-500/10 text-red-600",
    badgeLabel: "Action required",
    icon: XCircle,
    iconClassName: "text-red-500",
    title: "Verification needs to be resubmitted",
    description:
      "The previous submission could not be approved. Update your website or social page and upload clearer documents.",
    actionLabel: "Resubmit Documents",
  },
} as const;

export default async function WorkspaceSettingsPage() {
  const { member } = await requireOrgMembership();
  const activeOrg = await getActiveOrganization();

  if (!activeOrg) {
    return <div>No active organization found.</div>;
  }

  // Fetch full organizational data from database
  const org = await prisma.organization.findUnique({
    where: { id: activeOrg.id },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      workspaceVerificationStatus: true,
      websiteUrl: true,
      senderId: true,
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
    },
  });

  if (!org) {
    return <div>Failed to load organization settings.</div>;
  }

  // Use the members from full prisma object
  const members = org.members || [];
  const verification =
    verificationCopy[org.workspaceVerificationStatus] ??
    verificationCopy.not_submitted;
  const VerificationIcon = verification.icon;
  const requiresVerification = org.workspaceVerificationStatus !== "verified";

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
              <OrgNameForm orgId={org.id} initialName={org.name} />
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
              </div>
              <p className="text-muted-foreground text-xs">
                The slug is used in URLs and cannot be changed once set.
              </p>
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

      {/* Channel Configuration Section */}
      <SettingsCard>
        <SettingsCardHeader>
          <SettingsCardTitle>Workspace Verification</SettingsCardTitle>
          <SettingsCardDescription>
            Verify your organization to complete activation after your Sender ID
            has been requested.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent className="pt-6">
          <div className="max-w-3xl space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex gap-4">
                <div className="flex shrink-0 items-start justify-center py-1">
                  <VerificationIcon
                    className={`size-4 ${verification.iconClassName}`}
                  />
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">
                        {verification.title}
                      </p>
                      <Badge
                        variant="outline"
                        className={verification.badgeClassName}
                      >
                        {verification.badgeLabel}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {verification.description}
                    </p>
                  </div>
                </div>
              </div>

              {org.workspaceVerificationStatus === "not_submitted" ||
              org.workspaceVerificationStatus === "rejected" ? (
                <KybDialog
                  status={org.workspaceVerificationStatus}
                  initialWebsiteUrl={org.websiteUrl}
                >
                  <Button className="w-full md:w-auto">
                    {verification.actionLabel}
                  </Button>
                </KybDialog>
              ) : (
                <Button className="w-full md:w-auto" disabled variant="outline">
                  {verification.actionLabel}
                </Button>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="border-border/70 rounded-xl border p-4">
                <p className="text-sm font-medium">1. Business link</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Add your website or social media page so we can confirm your
                  public business presence.
                </p>
              </div>
              <div className="border-border/70 rounded-xl border p-4">
                <p className="text-sm font-medium">2. ID document</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Upload a clear photo of a valid identity document for the
                  person submitting the request.
                </p>
              </div>
              <div className="border-border/70 rounded-xl border p-4">
                <p className="text-sm font-medium">3. Business document</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Send a registration, certificate, or any official business
                  proof to complete the review.
                </p>
              </div>
            </div>
          </div>
        </SettingsCardContent>
      </SettingsCard>

      <SettingsCard>
        <SettingsCardHeader>
          <SettingsCardTitle>SMS Configuration</SettingsCardTitle>
          <SettingsCardDescription>
            Manage your messaging channel and identity for outbound SMS.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent className="pt-6">
          <div className="max-w-2xl space-y-5">
            {requiresVerification ? (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <div className="space-y-1">
                  <p className="text-foreground font-medium">
                    Verification is required before Sender ID setup
                  </p>
                  <p className="text-muted-foreground">
                    Finish workspace verification first. Once approved, you will
                    be able to request or change your Sender ID from this page.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-sm font-medium">Sender ID</label>
              <div className="flex gap-2">
                <Input
                  value={org.senderId || ""}
                  readOnly
                  className="bg-muted/50 font-medium tracking-wide uppercase"
                  placeholder="Not configured"
                />
                <SenderIdSettingsButton
                  senderId={org.senderId}
                  verificationStatus={org.workspaceVerificationStatus}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground font-medium">Status:</span>
              <Badge variant="outline" className={verification.badgeClassName}>
                {verification.badgeLabel}
              </Badge>
              {org.senderId ? (
                <span className="text-muted-foreground">
                  Current Sender ID:{" "}
                  <span className="text-foreground font-semibold">
                    {org.senderId}
                  </span>
                </span>
              ) : null}
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
