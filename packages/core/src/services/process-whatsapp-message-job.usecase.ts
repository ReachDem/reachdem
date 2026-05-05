import { prisma } from "@reachdem/database";
import type { WhatsAppExecutionJob } from "@reachdem/shared";
import { ActivityLogger } from "./activity-logger.service";
import { EvolutionWhatsAppAdapter } from "../adapters/whatsapp/evolution-whatsapp.adapter";
import { OrganizationWhatsAppSessionService } from "./organization-whatsapp-session.service";
import { personalizeTemplate } from "../utils/message-personalization";
import { CampaignStatsService } from "./campaign-stats.service";

interface ProcessJobOptions {
  republish: (job: WhatsAppExecutionJob) => Promise<void>;
  maxDeliveryCycles?: number;
}

export class ProcessWhatsAppMessageJobUseCase {
  static async execute(
    job: WhatsAppExecutionJob,
    options: ProcessJobOptions
  ): Promise<"skipped" | "sent" | "requeued" | "failed"> {
    const message = await prisma.message.findFirst({
      where: {
        id: job.message_id,
        organizationId: job.organization_id,
        channel: "whatsapp",
      },
      include: {
        attempts: {
          orderBy: { attemptNo: "asc" },
        },
      },
    });

    if (!message) {
      return "skipped";
    }

    if (!message.toE164 || !message.text) {
      await prisma.message.update({
        where: { id: message.id },
        data: { status: "failed" },
      });

      await ActivityLogger.log({
        organizationId: job.organization_id,
        correlationId: message.correlationId,
        category: "whatsapp",
        action: "send_failed",
        resourceType: "message",
        resourceId: message.id,
        status: "failed",
        meta: {
          message:
            "Message has incomplete WhatsApp payload for worker execution",
        },
      });

      return "failed";
    }

    const locked = await prisma.message.updateMany({
      where: {
        id: message.id,
        organizationId: job.organization_id,
        status: "queued",
      },
      data: {
        status: "sending",
      },
    });

    if (locked.count === 0) {
      return "skipped";
    }

    try {
      const session = await OrganizationWhatsAppSessionService.ensureSession(
        job.organization_id
      );
      const adapter = new EvolutionWhatsAppAdapter();

      const campaignTarget = await prisma.campaignTarget.findFirst({
        where: {
          messageId: message.id,
        },
        include: {
          contact: {
            select: {
              name: true,
              email: true,
              phoneE164: true,
              work: true,
              enterprise: true,
              address: true,
              customFields: true,
            },
          },
        },
      });
      const personalizedText = personalizeTemplate(
        message.text,
        campaignTarget?.contact ?? null
      );

      const result = await adapter.sendText(session.instanceName, {
        to: message.toE164,
        text: personalizedText,
        from: message.from,
      });

      if (result.success) {
        await prisma.$transaction([
          prisma.messageAttempt.create({
            data: {
              messageId: message.id,
              organizationId: job.organization_id,
              provider: adapter.providerName,
              attemptNo: message.attempts.length + 1,
              status: "sent",
              providerMessageId: result.providerMessageId,
              errorCode: null,
              errorMessage: null,
              durationMs: result.durationMs,
            },
          }),
          prisma.message.update({
            where: { id: message.id },
            data: {
              status: "sent",
              providerSelected: adapter.providerName,
              providerMessageId: result.providerMessageId,
            },
          }),
        ]);

        await ActivityLogger.log({
          organizationId: job.organization_id,
          correlationId: message.correlationId,
          category: "whatsapp",
          action: "send_success",
          resourceType: "message",
          resourceId: message.id,
          status: "success",
          provider: adapter.providerName,
          meta: {
            providerMessageId: result.providerMessageId,
          },
        });

        await this.markCampaignTarget(message.id, "sent");
        await this.finalizeCampaignIfReady(message.campaignId);
        await CampaignStatsService.invalidate(message.campaignId);

        return "sent";
      }

      const maxDeliveryCycles = options.maxDeliveryCycles ?? 3;

      if (job.delivery_cycle < maxDeliveryCycles && result.retryable) {
        await prisma.$transaction([
          prisma.messageAttempt.create({
            data: {
              messageId: message.id,
              organizationId: job.organization_id,
              provider: adapter.providerName,
              attemptNo: message.attempts.length + 1,
              status: "failed",
              providerMessageId: null,
              errorCode: result.errorCode,
              errorMessage: result.errorMessage,
              durationMs: result.durationMs,
            },
          }),
          prisma.message.update({
            where: { id: message.id },
            data: {
              status: "queued",
              providerSelected: adapter.providerName,
            },
          }),
        ]);

        await options.republish({
          ...job,
          delivery_cycle: job.delivery_cycle + 1,
        });

        return "requeued";
      }

      await prisma.$transaction([
        prisma.messageAttempt.create({
          data: {
            messageId: message.id,
            organizationId: job.organization_id,
            provider: adapter.providerName,
            attemptNo: message.attempts.length + 1,
            status: "failed",
            providerMessageId: null,
            errorCode: result.errorCode,
            errorMessage: result.errorMessage,
            durationMs: result.durationMs,
          },
        }),
        prisma.message.update({
          where: { id: message.id },
          data: {
            status: "failed",
            providerSelected: adapter.providerName,
          },
        }),
      ]);

      await ActivityLogger.log({
        organizationId: job.organization_id,
        correlationId: message.correlationId,
        category: "whatsapp",
        action: "send_failed",
        resourceType: "message",
        resourceId: message.id,
        status: "failed",
        provider: adapter.providerName,
        meta: {
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
        },
      });

      await this.markCampaignTarget(message.id, "failed");
      await this.finalizeCampaignIfReady(message.campaignId);
      await CampaignStatsService.invalidate(message.campaignId);

      return "failed";
    } catch (error) {
      await OrganizationWhatsAppSessionService.markError(
        job.organization_id,
        error instanceof Error ? error.message : String(error)
      );

      await prisma.message.updateMany({
        where: {
          id: message.id,
          organizationId: job.organization_id,
          status: "sending",
        },
        data: {
          status: "queued",
        },
      });

      throw error;
    }
  }

  private static async markCampaignTarget(
    messageId: string,
    status: "sent" | "failed"
  ): Promise<void> {
    await prisma.campaignTarget.updateMany({
      where: { messageId },
      data: { status },
    });
  }

  private static async finalizeCampaignIfReady(
    campaignId: string | null
  ): Promise<void> {
    if (!campaignId) return;

    const groupedStatuses = await prisma.campaignTarget.groupBy({
      by: ["status"],
      where: { campaignId },
      _count: { _all: true },
    });

    const counts = new Map(
      groupedStatuses.map((item) => [item.status, item._count._all])
    );
    const pendingCount = counts.get("pending") ?? 0;
    if (pendingCount > 0) return;

    const sentCount = counts.get("sent") ?? 0;
    const unsuccessfulCount =
      (counts.get("failed") ?? 0) + (counts.get("skipped") ?? 0);
    const finalStatus =
      unsuccessfulCount === 0
        ? "completed"
        : sentCount === 0
          ? "failed"
          : "partial";

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: finalStatus },
    });
  }
}
