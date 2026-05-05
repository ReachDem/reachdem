import { prisma } from "@reachdem/database";
import type { EmailExecutionJob } from "@reachdem/shared";
import { ActivityLogger } from "./activity-logger.service";
import { truncate } from "../utils/pii-scrubber";
import { CampaignStatsService } from "./campaign-stats.service";
import { personalizeTemplate } from "../utils/message-personalization";

export interface EmailSendResult {
  success: boolean;
  providerName: string;
  providerMessageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  durationMs: number;
}

interface ProcessEmailJobOptions {
  republish: (job: EmailExecutionJob) => Promise<void>;
  maxDeliveryCycles?: number;
  sendEmail: (input: {
    to: string;
    subject: string;
    html: string;
    from: string;
  }) => Promise<EmailSendResult>;
}

export class ProcessEmailMessageJobUseCase {
  static async execute(
    job: EmailExecutionJob,
    options: ProcessEmailJobOptions
  ): Promise<"skipped" | "sent" | "requeued" | "failed"> {
    const message = await prisma.message.findFirst({
      where: {
        id: job.message_id,
        organizationId: job.organization_id,
        channel: "email",
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

    if (!message.toEmail || !message.subject || !message.html) {
      await prisma.message.update({
        where: { id: job.message_id },
        data: { status: "failed" },
      });

      await this.markCampaignTarget(message.id, "failed");
      await this.finalizeCampaignIfReady(message.campaignId);
      await CampaignStatsService.invalidate(message.campaignId);

      await ActivityLogger.log({
        organizationId: job.organization_id,
        correlationId: message.correlationId,
        category: "email",
        action: "send_failed",
        resourceType: "message",
        resourceId: message.id,
        status: "failed",
        meta: {
          message: "Message has incomplete email payload for worker execution",
        },
      });

      return "failed";
    }

    const locked = await prisma.message.updateMany({
      where: {
        id: job.message_id,
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

    const attemptNo = message.attempts.length + 1;
    const campaignTarget = await prisma.campaignTarget.findFirst({
      where: {
        organizationId: job.organization_id,
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

    const personalizedSubject = personalizeTemplate(
      message.subject,
      campaignTarget?.contact ?? null
    );
    const personalizedHtml = personalizeTemplate(
      message.html,
      campaignTarget?.contact ?? null,
      { html: true }
    );

    const result = await options.sendEmail({
      to: message.toEmail,
      subject: personalizedSubject,
      html: personalizedHtml,
      from: message.from,
    });

    await prisma.messageAttempt.create({
      data: {
        messageId: message.id,
        organizationId: job.organization_id,
        provider: result.providerName,
        attemptNo,
        status: result.success ? "sent" : "failed",
        providerMessageId: result.success
          ? (result.providerMessageId ?? null)
          : null,
        errorCode: result.success ? null : (result.errorCode ?? null),
        errorMessage: result.success
          ? null
          : truncate(result.errorMessage ?? "", 500),
        durationMs: result.durationMs,
      },
    });

    if (result.success) {
      await prisma.message.update({
        where: { id: message.id },
        data: {
          status: "sent",
          providerSelected: result.providerName,
        },
      });

      await this.markCampaignTarget(message.id, "sent");
      await this.finalizeCampaignIfReady(message.campaignId);
      await CampaignStatsService.invalidate(message.campaignId);

      return "sent";
    }

    const maxDeliveryCycles = options.maxDeliveryCycles ?? 3;

    if (job.delivery_cycle < maxDeliveryCycles) {
      await prisma.message.update({
        where: { id: message.id },
        data: {
          status: "queued",
          providerSelected: result.providerName,
        },
      });

      await ActivityLogger.log({
        organizationId: job.organization_id,
        correlationId: message.correlationId,
        category: "email",
        action: "updated",
        resourceType: "message",
        resourceId: message.id,
        status: "pending",
        meta: {
          message: `Requeued email after failed delivery cycle ${job.delivery_cycle}`,
          deliveryCycle: job.delivery_cycle,
          nextDeliveryCycle: job.delivery_cycle + 1,
          provider: result.providerName,
        },
      });

      await options.republish({
        ...job,
        delivery_cycle: job.delivery_cycle + 1,
      });

      return "requeued";
    }

    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: "failed",
        providerSelected: result.providerName,
      },
    });

    await this.markCampaignTarget(message.id, "failed");
    await this.finalizeCampaignIfReady(message.campaignId);
    await CampaignStatsService.invalidate(message.campaignId);

    await ActivityLogger.log({
      organizationId: job.organization_id,
      correlationId: message.correlationId,
      category: "email",
      action: "send_failed",
      resourceType: "message",
      resourceId: message.id,
      status: "failed",
      meta: {
        message: `Email failed after ${job.delivery_cycle} delivery cycles`,
        deliveryCycle: job.delivery_cycle,
        provider: result.providerName,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
      },
    });

    return "failed";
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
