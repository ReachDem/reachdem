import { prisma } from "@reachdem/database";
import type { CampaignLaunchJob } from "@reachdem/shared";
import { ActivityLogger } from "./activity-logger.service";
import { CampaignService } from "./campaign.service";
import { SegmentService } from "./segment.service";
import { BillingCatalogService } from "./billing-catalog.service";
import { PlanEntitlementsService } from "./plan-entitlements.service";
import { CampaignLinkTrackingService } from "./campaign-link-tracking.service";
import {
  CampaignInsufficientCreditsError,
  CampaignInvalidStatusError,
  CampaignLaunchValidationError,
  CampaignNotFoundError,
} from "../errors/campaign.errors";

// URL regex for detecting URLs in content
const URL_REGEX =
  /((?:https?:\/\/|www\.|[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,})(?:[^\s<>"']*))/g;

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function isSameInstant(left: Date | null, right: Date): boolean {
  return left?.getTime() === right.getTime();
}

function isUnsubscribedFromChannel(
  hasUnsubscribed: unknown,
  channel: "sms" | "email"
): boolean {
  return (
    typeof hasUnsubscribed === "object" &&
    hasUnsubscribed !== null &&
    (hasUnsubscribed as Record<string, unknown>)[channel] === true
  );
}

export class RequestCampaignLaunchUseCase {
  private static readonly DEFAULT_SMS_SENDER_ID = "ReachDem";

  static async execute(
    organizationId: string,
    campaignId: string,
    publishCampaignLaunchJob: (job: CampaignLaunchJob) => Promise<void>
  ): Promise<void> {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
    });

    if (!campaign) {
      throw new CampaignNotFoundError();
    }

    if (campaign.status !== "draft") {
      throw new CampaignInvalidStatusError(
        `Cannot launch campaign in status '${campaign.status}'. Must be 'draft'.`
      );
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        planCode: true,
        creditBalance: true,
        creditCurrency: true,
        smsQuotaUsed: true,
        smsQuotaPeriodStartedAt: true,
        emailQuotaUsed: true,
        emailQuotaPeriodStartedAt: true,
        senderId: true,
        workspaceVerificationStatus: true,
      },
    });

    if (!organization) {
      throw new CampaignNotFoundError("Organization not found");
    }

    const eligibleTargetCount = await this.countEligibleTargets(
      organizationId,
      campaignId,
      campaign.channel
    );

    const now = new Date();
    const entitlements = PlanEntitlementsService.get(organization.planCode);
    const smsPeriodStart = startOfUtcMonth(now);
    const emailPeriodStart = startOfUtcDay(now);
    const currentUsage =
      campaign.channel === "sms"
        ? isSameInstant(organization.smsQuotaPeriodStartedAt, smsPeriodStart)
          ? organization.smsQuotaUsed
          : 0
        : isSameInstant(
              organization.emailQuotaPeriodStartedAt,
              emailPeriodStart
            )
          ? organization.emailQuotaUsed
          : 0;
    const includedLimit =
      campaign.channel === "sms"
        ? entitlements.smsIncludedLimit
        : entitlements.emailIncludedLimit;
    const includedRemaining =
      includedLimit == null ? 0 : Math.max(0, includedLimit - currentUsage);
    const billableUnits = Math.max(0, eligibleTargetCount - includedRemaining);

    const chargeAmountMinor = BillingCatalogService.calculateMessageChargeMinor(
      {
        channel: campaign.channel,
        units: billableUnits,
        currency: organization.creditCurrency,
      }
    );

    if (chargeAmountMinor > organization.creditBalance) {
      throw new CampaignInsufficientCreditsError(
        `Insufficient credit balance.`
      );
    }

    // Pre-process links before launching
    await CampaignLinkTrackingService.preprocessCampaignLinks(
      organizationId,
      campaign as any
    );

    await prisma.$transaction(async (tx) => {
      const updateContent =
        campaign.channel === "sms"
          ? {
              ...(campaign.content as any),
              from:
                organization.workspaceVerificationStatus === "verified" &&
                organization.senderId
                  ? organization.senderId
                  : this.DEFAULT_SMS_SENDER_ID,
              senderId:
                organization.workspaceVerificationStatus === "verified" &&
                organization.senderId
                  ? organization.senderId
                  : this.DEFAULT_SMS_SENDER_ID,
            }
          : undefined;

      await tx.organization.update({
        where: { id: organizationId },
        data: {
          ...(chargeAmountMinor > 0
            ? {
                creditBalance: {
                  decrement: chargeAmountMinor,
                },
              }
            : {}),
          ...(campaign.channel === "sms"
            ? {
                smsQuotaPeriodStartedAt: smsPeriodStart,
                smsQuotaUsed: currentUsage + eligibleTargetCount,
              }
            : {
                emailQuotaPeriodStartedAt: emailPeriodStart,
                emailQuotaUsed: currentUsage + eligibleTargetCount,
              }),
        },
      });

      await tx.campaign.update({
        where: { id: campaignId },
        data: {
          status: "running",
          ...(updateContent ? { content: updateContent } : {}),
        },
      });
    });

    await publishCampaignLaunchJob({
      campaign_id: campaignId,
      organization_id: organizationId,
    });

    await ActivityLogger.log({
      organizationId,
      actorType: "system",
      actorId: "system",
      category: campaign.channel === "email" ? "email" : "sms",
      action: "updated",
      resourceType: "campaign",
      resourceId: campaignId,
      status: "success",
      meta: {
        message: `Campaign ${campaign.name} queued for worker launch`,
      },
    });
  }

  private static async countEligibleTargets(
    organizationId: string,
    campaignId: string,
    channel: "sms" | "email"
  ): Promise<number> {
    const audiences = await CampaignService.getAudiences(
      organizationId,
      campaignId
    );
    const uniqueContacts = new Set<string>();

    for (const audience of audiences) {
      if (audience.sourceType === "group") {
        const contacts = await prisma.contact.findMany({
          where: {
            organizationId,
            memberships: {
              some: { groupId: audience.sourceId },
            },
            ...(channel === "sms"
              ? { phoneE164: { not: null } }
              : { email: { not: null } }),
          },
          select: {
            id: true,
            phoneE164: true,
            email: true,
            hasValidNumber: true,
            hasEmailableAddress: true,
            hasUnsubscribed: true,
          },
        });

        this.collectEligibleContactIds(uniqueContacts, contacts, channel);
        continue;
      }

      const segment = await SegmentService.getSegmentById(
        organizationId,
        audience.sourceId
      );
      let cursor: string | undefined;
      while (true) {
        const result = await SegmentService.evaluateSegmentDefinition(
          organizationId,
          segment.definition as any,
          500,
          cursor
        );

        this.collectEligibleContactIds(uniqueContacts, result.items, channel);
        if (!result.meta.nextCursor) break;
        cursor = result.meta.nextCursor;
      }
    }

    return uniqueContacts.size;
  }

  private static collectEligibleContactIds(
    uniqueContacts: Set<string>,
    contacts: Array<{
      id: string;
      phoneE164?: string | null;
      email?: string | null;
      hasValidNumber?: boolean | null;
      hasEmailableAddress?: boolean | null;
      hasUnsubscribed?: unknown;
    }>,
    channel: "sms" | "email"
  ): void {
    for (const contact of contacts) {
      const eligible =
        channel === "sms"
          ? Boolean(contact.phoneE164) &&
            contact.hasValidNumber !== false &&
            !isUnsubscribedFromChannel(contact.hasUnsubscribed, "sms")
          : Boolean(contact.email) &&
            contact.hasEmailableAddress !== false &&
            !isUnsubscribedFromChannel(contact.hasUnsubscribed, "email");

      if (!eligible) continue;
      uniqueContacts.add(contact.id);
    }
  }
}
