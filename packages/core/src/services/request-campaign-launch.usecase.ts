import { prisma } from "@reachdem/database";
import type { CampaignLaunchJob } from "@reachdem/shared";
import { ActivityLogger } from "./activity-logger.service";
import { BillingCatalogService } from "./billing-catalog.service";
import { TrackedLinkService } from "./tracked-link.service";
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

  private static resolveLogCategory(channel: "sms" | "email" | "whatsapp") {
    return channel;
  }

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

    const successfulTopUp = await prisma.paymentSession.findFirst({
      where: {
        organizationId,
        kind: "creditPurchase",
        status: "succeeded",
      },
      select: { id: true },
    });

    const eligibleTargetCount = await this.countEligibleTargets(
      organizationId,
      campaignId,
      campaign.channel
    );

    if (eligibleTargetCount === 0) {
      const channelField =
        campaign.channel === "email" ? "email address" : "phone number";
      throw new CampaignLaunchValidationError(
        `No eligible contacts found for this campaign. Make sure your audience group has contacts with a valid ${channelField}.`
      );
    }

    const entitlements = PlanEntitlementsService.applyCreditPurchaseStatus(
      PlanEntitlementsService.get(organization.planCode),
      { hasSuccessfulTopUp: Boolean(successfulTopUp) }
    );
    const remainingIncluded =
      campaign.channel === "whatsapp"
        ? null
        : PlanEntitlementsService.getRemainingIncluded(
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

    const usageCostMinor = BillingCatalogService.getMessageUsageCostMinor(
      campaign.channel,
      eligibleTargetCount
    );

    if (usageCostMinor > organization.creditBalance) {
      throw new CampaignInsufficientCreditsError(`Insufficient balance.`);
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
            decrement: usageCostMinor,
          },
          ...(campaign.channel === "sms"
            ? {
                smsQuotaUsed: {
                  increment: eligibleTargetCount,
                },
              }
            : campaign.channel === "email"
              ? {
                  emailQuotaUsed: {
                    increment: eligibleTargetCount,
                  },
                }
              : {}),
        },
      });

      await tx.campaign.update({
        where: { id: campaignId },
        data: {
          status: "running",
          ...(updateContent ? { content: updateContent } : {}),
        },
      });

      await publishCampaignLaunchJob({
        campaign_id: campaignId,
        organization_id: organizationId,
      });
    });

    await ActivityLogger.log({
      organizationId,
      actorType: "system",
      actorId: "system",
      category: this.resolveLogCategory(campaign.channel),
      action: "updated",
      resourceType: "campaign",
      resourceId: campaignId,
      status: "success",
      meta: {
        message: `Campaign ${campaign.name} queued for worker launch`,
      },
    });
  }

  private static async preprocessLinks(
    organizationId: string,
    campaign: any
  ): Promise<void> {
    const content = campaign.content as any;
    let textContent = "";
    let htmlContent = "";
    const channel = campaign.channel as "sms" | "email" | "whatsapp";

    // Extract text content based on channel
    if ((channel === "sms" || channel === "whatsapp") && content?.text) {
      textContent = content.text;
    } else if (channel === "email" && content?.html) {
      htmlContent = content.html;
    }

    // Find all URLs that are NOT already rcdm.ink links
    const urlsToShorten: string[] = [];
    const contentToScan = textContent || htmlContent;

    if (!contentToScan) return;

    const matches = contentToScan.matchAll(URL_REGEX);
    for (const match of matches) {
      const url = match[1];
      // Skip if already a shortened rcdm.ink link
      if (url.includes("rcdm.ink/")) continue;
      // Skip variables
      if (url.includes("{{") || url.includes("}}")) continue;

      if (!urlsToShorten.includes(url)) {
        urlsToShorten.push(url);
      }
    }

    // Create tracked links for each URL
    const linkMap = new Map<string, string>();
    for (const url of urlsToShorten) {
      try {
        const trackedLink = await TrackedLinkService.createLink(
          organizationId,
          {
            targetUrl: url,
            campaignId: campaign.id,
            channel,
          }
        );
        linkMap.set(url, trackedLink.shortUrl);
      } catch (error) {
        console.error(
          `[RequestCampaignLaunch] Failed to create tracked link for ${url}:`,
          error
        );
        // Continue with other links even if one fails
      }
    }

    // Replace URLs in content
    if (linkMap.size > 0) {
      let updatedContent = contentToScan;
      linkMap.forEach((shortUrl, originalUrl) => {
        updatedContent = updatedContent.replace(
          new RegExp(originalUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          shortUrl
        );
      });

      // Update campaign content
      if (channel === "sms" || channel === "whatsapp") {
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            content: {
              ...content,
              text: updatedContent,
            },
          },
        });
      } else if (channel === "email") {
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            content: {
              ...content,
              html: updatedContent,
            },
          },
        });
      }
    }
  }

  private static async countEligibleTargets(
    organizationId: string,
    campaignId: string,
    channel: "sms" | "email" | "whatsapp"
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
            ...(channel === "sms" || channel === "whatsapp"
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
    channel: "sms" | "email" | "whatsapp"
  ): void {
    for (const contact of contacts) {
      const eligible =
        channel === "sms" || channel === "whatsapp"
          ? Boolean(contact.phoneE164) && contact.hasValidNumber !== false
          : Boolean(contact.email) && contact.hasEmailableAddress !== false;

      if (!eligible) continue;
      uniqueContacts.add(contact.id);
    }
  }
}
