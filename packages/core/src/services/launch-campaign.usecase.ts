import { prisma, type CampaignStatus } from "@reachdem/database";
import { CampaignService } from "./campaign.service";
import { SendSmsUseCase } from "./send-sms.usecase";
import { SegmentService } from "./segment.service";
import { ActivityLogger } from "./activity-logger.service";
import { createHash } from "crypto";
import {
  CampaignInvalidStatusError,
  CampaignNotFoundError,
} from "../errors/campaign.errors";

type ResolvedContact = {
  id: string;
  phoneE164: string;
};

export class LaunchCampaignUseCase {
  static async execute(
    organizationId: string,
    campaignId: string
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

    // 1. Transition to RUNNING before resolving and sending
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "running" },
    });

    try {
      // 2. Resolve audience & deduplicate
      const targets = await this.resolveAndCreateTargets(
        organizationId,
        campaignId
      );

      if (targets.length === 0) {
        // Edge case: empty audience
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: "completed" },
        });

        await ActivityLogger.log({
          organizationId,
          actorType: "system",
          actorId: "system",
          category: "sms",
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

      // 3. Send messages sequentially for MVP (simplest approach without heavy workers)
      let sentCount = 0;
      let failedCount = 0;

      for (const target of targets) {
        // Skip previously resolved targets if we're retrying a stuck campaign (though currently it must be 'draft')
        if (target.status !== "pending") continue;

        try {
          // Idempotency key per workspace, per campaign, per target
          const idempotencyKey = `campaign_${campaignId}_contact_${target.contactId}`;

          const messageResponse = await SendSmsUseCase.execute(organizationId, {
            from: "ReachDem Campaign", // Default MVP sender
            to: target.contact.phoneE164!,
            text: campaign.content,
            idempotency_key: idempotencyKey,
            campaignId,
          });

          await prisma.campaignTarget.update({
            where: { id: target.id },
            data: {
              status: "sent",
              messageId: messageResponse.message_id,
            },
          });
          sentCount++;
        } catch (error: any) {
          await prisma.campaignTarget.update({
            where: { id: target.id },
            data: { status: "failed" },
          });
          failedCount++;
          console.error(
            `Failed to send campaign message to target ${target.id}:`,
            error
          );
        }
      }

      const finalStatus: CampaignStatus =
        failedCount === 0
          ? "completed"
          : sentCount === 0
            ? "failed"
            : "partial";

      // 4. Transition to final status
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: finalStatus },
      });

      await ActivityLogger.log({
        organizationId,
        actorType: "system",
        actorId: "system",
        category: "sms",
        action: "updated",
        resourceType: "campaign",
        resourceId: campaignId,
        status: finalStatus === "failed" ? "failed" : "success",
        meta: {
          message: `Campaign ${campaign.name} finished with status ${finalStatus}. Sent: ${sentCount}, Failed: ${failedCount}`,
          finalStatus,
          sentCount,
          failedCount,
        },
      });
    } catch (error: any) {
      // Critical error during preparation or overall execution
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "failed" },
      });

      await ActivityLogger.log({
        organizationId,
        actorType: "system",
        actorId: "system",
        category: "sms",
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

  /**
   * Resolves the audiences assigned to this campaign into actual contacts,
   * deduplicates them, hashes their phones, and creates CampaignTargets.
   */
  private static async resolveAndCreateTargets(
    organizationId: string,
    campaignId: string
  ) {
    const audiences = await CampaignService.getAudiences(
      organizationId,
      campaignId
    );

    // Map of contactId to contact object
    const uniqueContacts = new Map<string, ResolvedContact>();

    for (const audience of audiences) {
      if (audience.sourceType === "group") {
        const contacts = await prisma.contact.findMany({
          where: {
            organizationId,
            memberships: {
              some: { groupId: audience.sourceId },
            },
            phoneE164: { not: null },
          },
          select: {
            id: true,
            phoneE164: true,
          },
        });
        this.collectContacts(uniqueContacts, contacts);
        continue;
      }

      await this.collectSegmentContacts(
        uniqueContacts,
        organizationId,
        audience.sourceId
      );
    }

    const contactsToTarget = Array.from(uniqueContacts.values());

    // Create targets in Database. For a true MVP we can insert sequentially or with createMany
    // Note: createMany cannot be used easily with SQLite, but we are using Postgres!
    // But CampaignTarget needs `resolvedTo` (hashed phone).

    const targetPayloads = contactsToTarget.map((c) => ({
      campaignId,
      organizationId,
      contactId: c.id,
      resolvedTo: createHash("sha256").update(c.phoneE164).digest("hex"),
      status: "pending" as const,
    }));

    // If duplicate targets exist somehow, we can use try-catch or query first.
    // For safety, we clear existing targets if any exist (e.g. if it crashed during PREPARING)
    await prisma.campaignTarget.deleteMany({
      where: { campaignId },
    });

    if (targetPayloads.length > 0) {
      await prisma.campaignTarget.createMany({
        data: targetPayloads,
      });
    }

    // Return the inserted targets with their contact phone for the sender loop
    return await prisma.campaignTarget.findMany({
      where: { campaignId },
      include: { contact: true }, // Contact is needed for phone number
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Resolves a segment's contacts by building the raw SQL query.
   */
  private static collectContacts(
    uniqueContacts: Map<string, ResolvedContact>,
    contacts: Array<{ id: string; phoneE164: string | null }>
  ): void {
    for (const contact of contacts) {
      if (!contact.phoneE164 || uniqueContacts.has(contact.id)) continue;

      uniqueContacts.set(contact.id, {
        id: contact.id,
        phoneE164: contact.phoneE164,
      });
    }
  }

  private static async collectSegmentContacts(
    uniqueContacts: Map<string, ResolvedContact>,
    organizationId: string,
    segmentId: string
  ): Promise<void> {
    const segment = await SegmentService.getSegmentById(
      organizationId,
      segmentId
    );

    let cursor: string | undefined = undefined;

    while (true) {
      const result = await SegmentService.evaluateSegmentDefinition(
        organizationId,
        segment.definition as any,
        500,
        cursor
      );

      this.collectContacts(uniqueContacts, result.items);

      if (!result.meta.nextCursor) break;
      cursor = result.meta.nextCursor;
    }
  }
}
