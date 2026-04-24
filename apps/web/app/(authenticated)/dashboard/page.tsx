import { auth } from "@reachdem/auth";
import { CampaignService, CampaignStatsService } from "@reachdem/core";
import { prisma } from "@reachdem/database";
import Link from "next/link";
import { headers } from "next/headers";

import { Button } from "@/components/ui/button";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { Cta18 } from "@/components/cta18";
import { DataTable } from "@/components/data-table";
import { DashboardChecklist } from "@/components/onboarding/dashboard-checklist";

function isScheduledCampaign(campaign: {
  status: string;
  scheduledAt: Date | string | null;
}) {
  return (
    campaign.status === "draft" &&
    Boolean(campaign.scheduledAt) &&
    new Date(campaign.scheduledAt as Date | string).getTime() > Date.now()
  );
}

function getDashboardStatus(
  campaign: {
    status: string;
    scheduledAt: Date | string | null;
  },
  stats?: { resolvedStatus?: string } | null
) {
  if (isScheduledCampaign(campaign)) {
    return "Scheduled";
  }

  switch (stats?.resolvedStatus ?? campaign.status) {
    case "draft":
      return "Draft";
    case "running":
      return "In Progress";
    case "partial":
      return "Partial";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "expired":
      return "Expired";
    default:
      return campaign.status;
  }
}

function getAudienceLabel(
  audiences: Array<{ sourceType: "group" | "segment"; sourceId: string }>
) {
  if (audiences.length === 0) {
    return "No audience";
  }

  const groupCount = audiences.filter(
    (item) => item.sourceType === "group"
  ).length;
  const segmentCount = audiences.filter(
    (item) => item.sourceType === "segment"
  ).length;

  const parts: string[] = [];
  if (groupCount > 0) {
    parts.push(`${groupCount} group${groupCount > 1 ? "s" : ""}`);
  }
  if (segmentCount > 0) {
    parts.push(`${segmentCount} segment${segmentCount > 1 ? "s" : ""}`);
  }

  return parts.join(" / ");
}

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });

  let hasContacts = false;
  let campaignRows: Array<{
    id: string;
    header: string;
    description: string | null;
    type: "SMS" | "Email" | "WhatsApp";
    status: string;
    target: string;
    limit: string;
    reviewer: string;
    href: string;
    canLaunch: boolean;
  }> = [];

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    const organizationId =
      session.session.activeOrganizationId ??
      user?.defaultOrganizationId ??
      null;

    if (organizationId) {
      const [contactsCount, campaigns] = await Promise.all([
        prisma.contact.count({
          where: { organizationId },
        }),
        CampaignService.listCampaigns(organizationId, { limit: 100 }),
      ]);

      hasContacts = contactsCount > 0;

      campaignRows = await Promise.all(
        campaigns.items.map(async (campaign) => {
          const [audiences, stats] = await Promise.all([
            CampaignService.getAudiences(organizationId, campaign.id).catch(
              () => []
            ),
            campaign.status === "draft"
              ? Promise.resolve(null)
              : CampaignStatsService.getCampaignStats(
                  organizationId,
                  campaign.id
                ).catch(() => null),
          ]);

          return {
            id: campaign.id,
            header: campaign.name,
            description: campaign.description,
            type:
              campaign.channel === "email"
                ? "Email"
                : campaign.channel === "whatsapp"
                  ? "WhatsApp"
                  : "SMS",
            status: getDashboardStatus(campaign, stats),
            target: (stats?.sentCount ?? 0).toLocaleString(),
            limit: (stats?.audienceSize ?? 0).toLocaleString(),
            reviewer: getAudienceLabel(audiences),
            href:
              campaign.status === "draft"
                ? `/campaigns/${campaign.id}/edit`
                : `/campaigns/${campaign.id}`,
            canLaunch:
              campaign.status === "draft" && !isScheduledCampaign(campaign),
          };
        })
      );
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <DashboardChecklist />
          <div className="px-4 lg:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                  Dashboard
                </h1>
                <p className="text-muted-foreground text-sm md:text-base">
                  Track your active campaigns, review delivery progress, and
                  launch new outreach from one place.
                </p>
              </div>
              <Button asChild className="w-full md:w-auto">
                <Link href="/campaigns/new">Create Campaign</Link>
              </Button>
            </div>
          </div>
          {hasContacts ? (
            <>
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>
              <DataTable data={campaignRows} />
            </>
          ) : (
            <div className="flex flex-col gap-8 px-4 lg:px-6">
              <Cta18 />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
