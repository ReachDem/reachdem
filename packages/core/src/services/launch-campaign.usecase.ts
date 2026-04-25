import { prisma } from "@reachdem/database";
import type {
  EmailExecutionJob,
  SmsExecutionJob,
  WhatsAppExecutionJob,
} from "@reachdem/shared";
import { createHash } from "crypto";
import { ActivityLogger } from "./activity-logger.service";
import { CampaignService } from "./campaign.service";
import { EnqueueEmailUseCase } from "./enqueue-email.usecase";
import { EnqueueSmsUseCase } from "./enqueue-sms.usecase";
import { EnqueueWhatsAppUseCase } from "./enqueue-whatsapp.usecase";
import { SegmentService } from "./segment.service";
import {
  CampaignInvalidStatusError,
  CampaignNotFoundError,
} from "../errors/campaign.errors";

type ResolvedContact = {
  id: string;
  phoneE164?: string;
  email?: string;
  hasValidNumber?: boolean | null;
  hasEmailableAddress?: boolean | null;
};

export class LaunchCampaignUseCase {
  private static resolveMessageScheduledAt(
    campaignScheduledAt: Date | null
  ): string | undefined {
    if (!campaignScheduledAt) {
      return undefined;
    }

    return campaignScheduledAt.getTime() > Date.now()
      ? campaignScheduledAt.toISOString()
      : undefined;
  }

  static async execute(
    organizationId: string,
    campaignId: string,
    publishSmsJob: (job: SmsExecutionJob) => Promise<void>,
    publishEmailJob: (job: EmailExecutionJob) => Promise<void>,
    publishWhatsAppJob: (job: WhatsAppExecutionJob) => Promise<void>
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

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "running" },
    });

    try {
      const targets = await this.resolveAndCreateTargets(
        organizationId,
        campaignId,
        campaign.channel
      );

      if (targets.length === 0) {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: "completed" },
        });

        await ActivityLogger.log({
          organizationId,
          actorType: "system",
          actorId: "system",
          category: campaign.channel,
          action: "updated",
          resourceType: "campaign",
          resourceId: campaignId,
          status: "success",
          meta: {
            message: "Completed empty campaign",
            campaignId,
            targetCount: 0,
          },
        });
        return;
      }

      let queuedCount = 0;
      let scheduledCount = 0;
      let failedCount = 0;
      const parsedCampaign = CampaignService.getCampaignContent(
        campaign as any
      );
      const campaignChannel = campaign.channel as "sms" | "email" | "whatsapp";
      const isEmailCampaign = campaignChannel === "email";
      const isWhatsAppCampaign = campaignChannel === "whatsapp";
      const logCategory = campaignChannel;

      for (const target of targets) {
        if (target.status !== "pending") continue;

        try {
          const idempotencyKey = `campaign_${campaignId}_contact_${target.contactId}`;
          const scheduledAt = this.resolveMessageScheduledAt(
            campaign.scheduledAt
          );
          const messageResponse = await (isWhatsAppCampaign
            ? EnqueueWhatsAppUseCase.execute(
                organizationId,
                {
                  to: target.contact.phoneE164!,
                  text: "text" in parsedCampaign ? parsedCampaign.text : "",
                  from:
                    ("text" in parsedCampaign
                      ? parsedCampaign.from
                      : undefined) ?? "ReachDem WhatsApp",
                  idempotency_key: idempotencyKey,
                  campaignId,
                  scheduledAt,
                },
                publishWhatsAppJob
              )
            : !isEmailCampaign
              ? EnqueueSmsUseCase.execute(
                  organizationId,
                  {
                    from:
                      ("text" in parsedCampaign
                        ? parsedCampaign.from
                        : undefined) ?? "ReachDem",
                    to: target.contact.phoneE164!,
                    text: "text" in parsedCampaign ? parsedCampaign.text : "",
                    idempotency_key: idempotencyKey,
                    campaignId,
                    scheduledAt,
                  },
                  publishSmsJob
                )
              : EnqueueEmailUseCase.execute(
                  organizationId,
                  {
                    to: target.contact.email!,
                    subject:
                      "subject" in parsedCampaign ? parsedCampaign.subject : "",
                    html: "html" in parsedCampaign ? parsedCampaign.html : "",
                    from:
                      ("subject" in parsedCampaign
                        ? parsedCampaign.from
                        : undefined) ?? "ReachDem",
                    idempotency_key: idempotencyKey,
                    campaignId,
                    scheduledAt,
                  },
                  publishEmailJob
                ));

          await prisma.campaignTarget.update({
            where: { id: target.id },
            data: {
              messageId: messageResponse.message_id,
            },
          });

          if (messageResponse.status === "scheduled") {
            scheduledCount++;
          } else {
            queuedCount++;
          }
        } catch (error) {
          await prisma.campaignTarget.update({
            where: { id: target.id },
            data: { status: "failed" },
          });
          failedCount++;
          console.error(
            `Failed to enqueue campaign message for target ${target.id}:`,
            error
          );
        }
      }

      if (queuedCount === 0 && scheduledCount === 0 && failedCount > 0) {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: "failed" },
        });

        await ActivityLogger.log({
          organizationId,
          actorType: "system",
          actorId: "system",
          category: logCategory,
          action: "send_failed",
          resourceType: "campaign",
          resourceId: campaignId,
          status: "failed",
          meta: {
            message: `Campaign ${campaign.name} failed during enqueue`,
            queuedCount,
            scheduledCount,
            failedCount,
          },
        });
        return;
      }

      await ActivityLogger.log({
        organizationId,
        actorType: "system",
        actorId: "system",
        category: logCategory,
        action: "updated",
        resourceType: "campaign",
        resourceId: campaignId,
        status: "success",
        meta: {
          message: `Campaign ${campaign.name} launched for asynchronous processing`,
          queuedCount,
          scheduledCount,
          failedCount,
          targetCount: targets.length,
        },
      });
    } catch (error: any) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "failed" },
      });

      await ActivityLogger.log({
        organizationId,
        actorType: "system",
        actorId: "system",
        category: campaign.channel,
        action: "send_failed",
        resourceType: "campaign",
        resourceId: campaignId,
        status: "failed",
        meta: {
          message: `Critical failure in campaign ${campaignId}: ${error.message}`,
          error: error.message,
        },
      });

      throw error;
    }
  }

  private static async resolveAndCreateTargets(
    organizationId: string,
    campaignId: string,
    channel: "sms" | "email" | "whatsapp"
  ) {
    const audiences = await CampaignService.getAudiences(
      organizationId,
      campaignId
    );

    const uniqueContacts = new Map<string, ResolvedContact>();

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
        this.collectContacts(uniqueContacts, contacts, channel);
        continue;
      }

      await this.collectSegmentContacts(
        uniqueContacts,
        organizationId,
        audience.sourceId,
        channel
      );
    }

    const targetPayloads = Array.from(uniqueContacts.values()).map(
      (contact) => ({
        campaignId,
        organizationId,
        contactId: contact.id,
        resolvedTo: createHash("sha256")
          .update(
            channel === "sms" || channel === "whatsapp"
              ? contact.phoneE164!
              : contact.email!
          )
          .digest("hex"),
        status: "pending" as const,
      })
    );

    await prisma.campaignTarget.deleteMany({
      where: { campaignId },
    });

    if (targetPayloads.length > 0) {
      await prisma.campaignTarget.createMany({
        data: targetPayloads,
      });
    }

    return prisma.campaignTarget.findMany({
      where: { campaignId },
      include: { contact: true },
      orderBy: { createdAt: "asc" },
    });
  }

  private static collectContacts(
    uniqueContacts: Map<string, ResolvedContact>,
    contacts: Array<{
      id: string;
      phoneE164: string | null;
      email?: string | null;
      hasValidNumber?: boolean | null;
      hasEmailableAddress?: boolean | null;
    }>,
    channel: "sms" | "email" | "whatsapp"
  ): void {
    for (const contact of contacts) {
      if (
        !this.isContactEligible(contact, channel) ||
        uniqueContacts.has(contact.id)
      ) {
        continue;
      }

      uniqueContacts.set(contact.id, {
        id: contact.id,
        phoneE164: contact.phoneE164 ?? undefined,
        email: contact.email ?? undefined,
        hasValidNumber: contact.hasValidNumber,
        hasEmailableAddress: contact.hasEmailableAddress,
      });
    }
  }

  private static isContactEligible(
    contact: {
      phoneE164?: string | null;
      email?: string | null;
      hasValidNumber?: boolean | null;
      hasEmailableAddress?: boolean | null;
    },
    channel: "sms" | "email" | "whatsapp"
  ): boolean {
    if (channel === "sms" || channel === "whatsapp") {
      if (!contact.phoneE164) return false;
      return contact.hasValidNumber !== false;
    }

    if (!contact.email) return false;
    return contact.hasEmailableAddress !== false;
  }

  private static async collectSegmentContacts(
    uniqueContacts: Map<string, ResolvedContact>,
    organizationId: string,
    segmentId: string,
    channel: "sms" | "email" | "whatsapp"
  ): Promise<void> {
    const segment = await SegmentService.getSegmentById(
      organizationId,
      segmentId
    );

    let cursor: string | undefined;

    while (true) {
      const result = await SegmentService.evaluateSegmentDefinition(
        organizationId,
        segment.definition as any,
        500,
        cursor
      );

      this.collectContacts(uniqueContacts, result.items, channel);

      if (!result.meta.nextCursor) break;
      cursor = result.meta.nextCursor;
    }
  }
}
