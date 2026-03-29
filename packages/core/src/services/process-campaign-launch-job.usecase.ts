import { prisma } from "@reachdem/database";
import type {
  CampaignLaunchJob,
  EmailExecutionJob,
  SmsExecutionJob,
} from "@reachdem/shared";
import { createHash } from "crypto";
import { ActivityLogger } from "./activity-logger.service";
import { CampaignLinkTrackingService } from "./campaign-link-tracking.service";
import { CampaignService } from "./campaign.service";
import { EnqueueEmailUseCase } from "./enqueue-email.usecase";
import { EnqueueSmsUseCase } from "./enqueue-sms.usecase";
import { SegmentService } from "./segment.service";

type ResolvedContact = {
  id: string;
  phoneE164?: string;
  email?: string;
};

export class ProcessCampaignLaunchJobUseCase {
  static async execute(
    job: CampaignLaunchJob,
    publishSmsJob: (job: SmsExecutionJob) => Promise<void>,
    publishEmailJob: (job: EmailExecutionJob) => Promise<void>
  ): Promise<"skipped" | "processed"> {
    const campaign = await prisma.campaign.findFirst({
      where: { id: job.campaign_id, organizationId: job.organization_id },
    });

    if (!campaign) {
      return "skipped";
    }

    try {
      await CampaignLinkTrackingService.preprocessCampaignLinks(
        job.organization_id,
        campaign as any
      );

      const refreshedCampaign = await prisma.campaign.findFirst({
        where: { id: job.campaign_id, organizationId: job.organization_id },
      });

      if (!refreshedCampaign) {
        return "skipped";
      }

      const targets = await this.resolveAndCreateTargets(
        job.organization_id,
        job.campaign_id,
        refreshedCampaign.channel
      );

      if (targets.length === 0) {
        await prisma.campaign.update({
          where: { id: job.campaign_id },
          data: { status: "completed" },
        });

        await ActivityLogger.log({
          organizationId: job.organization_id,
          actorType: "system",
          actorId: "system",
          category: campaign.channel === "email" ? "email" : "sms",
          action: "updated",
          resourceType: "campaign",
          resourceId: job.campaign_id,
          status: "success",
          meta: {
            message: "Completed empty campaign",
            campaignId: job.campaign_id,
            targetCount: 0,
          },
        });
        return "processed";
      }

      let queuedCount = 0;
      let scheduledCount = 0;
      let failedCount = 0;
      const parsedCampaign = CampaignService.getCampaignContent(
        refreshedCampaign as any
      );
      const isEmailCampaign =
        (refreshedCampaign.channel as "sms" | "email") === "email";
      const logCategory = isEmailCampaign ? "email" : "sms";

      for (const target of targets) {
        if (target.status !== "pending") continue;

        try {
          const idempotencyKey = `campaign_${job.campaign_id}_contact_${target.contactId}`;
          const scheduledAt = refreshedCampaign.scheduledAt?.toISOString();
          const messageResponse = await (!isEmailCampaign
            ? EnqueueSmsUseCase.execute(
                job.organization_id,
                {
                  from:
                    ("text" in parsedCampaign
                      ? parsedCampaign.from
                      : undefined) ?? "ReachDem Campaign",
                  to: target.contact.phoneE164!,
                  text: "text" in parsedCampaign ? parsedCampaign.text : "",
                  idempotency_key: idempotencyKey,
                  campaignId: job.campaign_id,
                  scheduledAt,
                },
                publishSmsJob
              )
            : EnqueueEmailUseCase.execute(
                job.organization_id,
                {
                  to: target.contact.email!,
                  subject:
                    "subject" in parsedCampaign ? parsedCampaign.subject : "",
                  html: "html" in parsedCampaign ? parsedCampaign.html : "",
                  from:
                    ("subject" in parsedCampaign
                      ? parsedCampaign.from
                      : undefined) ?? "ReachDem Notifications",
                  idempotency_key: idempotencyKey,
                  campaignId: job.campaign_id,
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
            `[Campaign Launch] Failed to enqueue campaign message for target ${target.id}:`,
            error
          );
        }
      }

      if (queuedCount === 0 && scheduledCount === 0 && failedCount > 0) {
        await prisma.campaign.update({
          where: { id: job.campaign_id },
          data: { status: "failed" },
        });

        await ActivityLogger.log({
          organizationId: job.organization_id,
          actorType: "system",
          actorId: "system",
          category: logCategory,
          action: "send_failed",
          resourceType: "campaign",
          resourceId: job.campaign_id,
          status: "failed",
          meta: {
            message: `Campaign ${refreshedCampaign.name} failed during enqueue`,
            queuedCount,
            scheduledCount,
            failedCount,
          },
        });
        return "processed";
      }

      await ActivityLogger.log({
        organizationId: job.organization_id,
        actorType: "system",
        actorId: "system",
        category: logCategory,
        action: "updated",
        resourceType: "campaign",
        resourceId: job.campaign_id,
        status: "success",
        meta: {
          message: `Campaign ${refreshedCampaign.name} launched for asynchronous processing`,
          queuedCount,
          scheduledCount,
          failedCount,
          targetCount: targets.length,
        },
      });

      return "processed";
    } catch (error: any) {
      await prisma.campaign.update({
        where: { id: job.campaign_id },
        data: { status: "failed" },
      });

      await ActivityLogger.log({
        organizationId: job.organization_id,
        actorType: "system",
        actorId: "system",
        category: campaign.channel === "email" ? "email" : "sms",
        action: "send_failed",
        resourceType: "campaign",
        resourceId: job.campaign_id,
        status: "failed",
        meta: {
          message: `Critical failure in campaign ${job.campaign_id}: ${error.message}`,
          error: error.message,
        },
      });

      throw error;
    }
  }

  private static async resolveAndCreateTargets(
    organizationId: string,
    campaignId: string,
    channel: "sms" | "email"
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
            ...(channel === "sms"
              ? { phoneE164: { not: null } }
              : { email: { not: null } }),
          },
          select: {
            id: true,
            phoneE164: true,
            email: true,
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
          .update(channel === "sms" ? contact.phoneE164! : contact.email!)
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
    }>,
    channel: "sms" | "email"
  ): void {
    for (const contact of contacts) {
      if (
        (channel === "sms" && !contact.phoneE164) ||
        (channel === "email" && !contact.email) ||
        uniqueContacts.has(contact.id)
      ) {
        continue;
      }

      uniqueContacts.set(contact.id, {
        id: contact.id,
        phoneE164: contact.phoneE164 ?? undefined,
        email: contact.email ?? undefined,
      });
    }
  }

  private static async collectSegmentContacts(
    uniqueContacts: Map<string, ResolvedContact>,
    organizationId: string,
    segmentId: string,
    channel: "sms" | "email"
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
