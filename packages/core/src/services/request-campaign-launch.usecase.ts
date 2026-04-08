import { prisma } from "@reachdem/database";
import type { CampaignLaunchJob } from "@reachdem/shared";
import { ActivityLogger } from "./activity-logger.service";
import { CampaignService } from "./campaign.service";
import { SegmentService } from "./segment.service";
import { MessagingEntitlementsService } from "./messaging-entitlements.service";
import { CampaignLinkTrackingService } from "./campaign-link-tracking.service";
import {
  CampaignInsufficientCreditsError,
  CampaignInvalidStatusError,
  CampaignLaunchValidationError,
  CampaignNotFoundError,
} from "../errors/campaign.errors";
import { MessageInsufficientCreditsError } from "../errors/messaging.errors";

// URL regex for detecting URLs in content
const URL_REGEX =
  /((?:https?:\/\/|www\.|[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,})(?:[^\s<>"']*))/g;

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

    const eligibleTargetCount = await this.countEligibleTargets(
      organizationId,
      campaignId,
      campaign.channel
    );

    // Pre-process links before launching
    await CampaignLinkTrackingService.preprocessCampaignLinks(
      organizationId,
      campaign as any
    );

    await prisma.$transaction(
      async (tx) => {
        let reservation: { senderId: string | null };
        try {
          reservation = await MessagingEntitlementsService.reserveMessageSend(
            tx,
            organizationId,
            campaign.channel,
            eligibleTargetCount,
            {
              apiKeyId: campaign.apiKeyId ?? null,
              campaignId,
              source: campaign.apiKeyId ? "publicApi" : "dashboard",
            }
          );
        } catch (error) {
          if (error instanceof MessageInsufficientCreditsError) {
            throw new CampaignInsufficientCreditsError(
              "Insufficient credit balance."
            );
          }
          throw error;
        }

        const updateContent =
          campaign.channel === "sms"
            ? {
                ...(campaign.content as any),
                from: reservation.senderId,
                senderId: reservation.senderId,
              }
            : undefined;

        await tx.campaign.update({
          where: { id: campaignId },
          data: {
            status: "running",
            ...(updateContent ? { content: updateContent } : {}),
          },
        });
      },
      {
        maxWait: 10_000,
        timeout: 20_000,
      }
    );

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
