import { prisma } from "@reachdem/database";
import type { CampaignLaunchJob } from "@reachdem/shared";
import { ActivityLogger } from "./activity-logger.service";
import { CampaignService } from "./campaign.service";
import { SegmentService } from "./segment.service";
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
        smsQuotaUsed: true,
        emailQuotaUsed: true,
        senderId: true,
        workspaceVerificationStatus: true,
      },
    });

    if (!organization) {
      throw new CampaignNotFoundError("Organization not found");
    }

    const totalPurchasesResult = await prisma.paymentSession.aggregate({
      where: {
        organizationId,
        status: "succeeded",
      },
      _sum: {
        amountMinor: true,
      },
    });
    const totalPurchasedMinor = totalPurchasesResult._sum.amountMinor || 0;

    const eligibleTargetCount = await this.countEligibleTargets(
      organizationId,
      campaignId,
      campaign.channel
    );

    const entitlements = PlanEntitlementsService.applyCreditPurchaseStatus(
      PlanEntitlementsService.get(organization.planCode),
      { totalPurchasedMinor }
    );
    const remainingIncluded = PlanEntitlementsService.getRemainingIncluded(
      entitlements,
      {
        smsQuotaUsed: organization.smsQuotaUsed,
        emailQuotaUsed: organization.emailQuotaUsed,
      },
      campaign.channel
    );

    if (remainingIncluded != null) {
      if (eligibleTargetCount > remainingIncluded) {
        throw new CampaignInsufficientCreditsError(
          `Sending limit reached for ${campaign.channel} under plan ${entitlements.planCode}.`
        );
      }
    }

    if (eligibleTargetCount > organization.creditBalance) {
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
          creditBalance: {
            decrement: eligibleTargetCount,
          },
          ...(campaign.channel === "sms"
            ? {
              smsQuotaUsed: {
                increment: eligibleTargetCount,
              },
            }
            : {
              emailQuotaUsed: {
                increment: eligibleTargetCount,
              },
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
    }>,
    channel: "sms" | "email"
  ): void {
    for (const contact of contacts) {
      const eligible =
        channel === "sms"
          ? Boolean(contact.phoneE164) && contact.hasValidNumber !== false
          : Boolean(contact.email) && contact.hasEmailableAddress !== false;

      if (!eligible) continue;
      uniqueContacts.add(contact.id);
    }
  }
}
