import { prisma } from "@reachdem/database";
import { CompositeSmseSender } from "./composite-sms-sender";
import { truncate } from "../utils/pii-scrubber";
import type { SmsExecutionJob } from "@reachdem/shared";
import { ActivityLogger } from "./activity-logger.service";
import { CampaignStatsService } from "./campaign-stats.service";
import { personalizeTemplate } from "../utils/message-personalization";

interface ProcessJobOptions {
  republish: (job: SmsExecutionJob) => Promise<void>;
}

export class ProcessSmsMessageJobUseCase {
  static async execute(
    job: SmsExecutionJob,
    options: ProcessJobOptions
  ): Promise<"skipped" | "sent" | "requeued" | "failed"> {
    const message = await prisma.message.findFirst({
      where: {
        id: job.message_id,
        organizationId: job.organization_id,
        channel: job.channel,
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
      await ActivityLogger.log({
        organizationId: job.organization_id,
        correlationId: message.correlationId,
        category: "sms",
        action: "send_failed",
        resourceType: "message",
        resourceId: message.id,
        status: "failed",
        meta: {
          message: "Message has incomplete SMS payload for worker execution",
        },
      });

      await prisma.message.update({
        where: { id: message.id },
        data: { status: "failed" },
      });

      await this.markCampaignTarget(message.id, "failed");
      await this.finalizeCampaignIfReady(message.campaignId);
      await CampaignStatsService.invalidate(message.campaignId);

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

    const baseAttemptNo = message.attempts.length;
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
    const personalizedText = personalizeTemplate(
      message.text,
      campaignTarget?.contact ?? null
    );

    const result = await CompositeSmseSender.send(
      job.organization_id,
      message.correlationId,
      {
        to: message.toE164,
        text: personalizedText,
        from: message.from,
      }
    );

    for (const [index, attempt] of result.attempts.entries()) {
      await prisma.messageAttempt.create({
        data: {
          messageId: message.id,
          organizationId: job.organization_id,
          provider: attempt.providerName,
          attemptNo: baseAttemptNo + index + 1,
          status: attempt.success ? "sent" : "failed",
          providerMessageId: attempt.success
            ? (attempt.providerMessageId ?? null)
            : null,
          errorCode: attempt.success ? null : (attempt.errorCode ?? null),
          errorMessage: attempt.success
            ? null
            : truncate(attempt.errorMessage ?? "", 500),
          durationMs: attempt.durationMs,
        },
      });
    }

    if (result.success) {
      await prisma.message.update({
        where: { id: message.id },
        data: {
          from: result.senderUsed,
          status: "sent",
          providerSelected: result.providerName,
        },
      });

      await this.markCampaignTarget(message.id, "sent");
      await this.finalizeCampaignIfReady(message.campaignId);
      await CampaignStatsService.invalidate(message.campaignId);

      return "sent";
    }

    if (job.delivery_cycle < 3) {
      console.warn("[SMS Delivery] Requeue after failed provider attempts", {
        messageId: message.id,
        organizationId: job.organization_id,
        deliveryCycle: job.delivery_cycle,
        provider: result.providerName,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        httpStatus: result.httpStatus ?? null,
        responseMeta: result.responseMeta ?? null,
        attempts: result.attempts.map((attempt) => ({
          providerName: attempt.providerName,
          success: attempt.success,
          errorCode: attempt.errorCode ?? null,
          errorMessage: attempt.errorMessage ?? null,
          retryable: attempt.retryable ?? null,
          httpStatus: attempt.httpStatus ?? null,
          responseMeta: attempt.responseMeta ?? null,
        })),
      });

      await prisma.message.update({
        where: { id: message.id },
        data: {
          from: result.senderUsed,
          status: "queued",
          providerSelected: result.providerName,
        },
      });

      await ActivityLogger.log({
        organizationId: job.organization_id,
        correlationId: message.correlationId,
        category: "sms",
        action: "updated",
        resourceType: "message",
        resourceId: message.id,
        status: "pending",
        meta: {
          message: `Requeued message after failed delivery cycle ${job.delivery_cycle}`,
          deliveryCycle: job.delivery_cycle,
          nextDeliveryCycle: job.delivery_cycle + 1,
          provider: result.providerName,
          httpStatus: result.httpStatus ?? null,
          responseMeta: result.responseMeta ?? null,
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
        from: result.senderUsed,
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
      category: "sms",
      action: "send_failed",
      resourceType: "message",
      resourceId: message.id,
      status: "failed",
      meta: {
        message: `Message failed after ${job.delivery_cycle} delivery cycles`,
        deliveryCycle: job.delivery_cycle,
        provider: result.providerName,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        httpStatus: result.httpStatus ?? null,
        responseMeta: result.responseMeta ?? null,
        attempts: result.attempts.map((attempt) => ({
          providerName: attempt.providerName,
          success: attempt.success,
          errorCode: attempt.errorCode ?? null,
          errorMessage: attempt.errorMessage ?? null,
          retryable: attempt.retryable ?? null,
          httpStatus: attempt.httpStatus ?? null,
          responseMeta: attempt.responseMeta ?? null,
        })),
      },
    });

    console.error("[SMS Delivery] Final failure after provider attempts", {
      messageId: message.id,
      organizationId: job.organization_id,
      deliveryCycle: job.delivery_cycle,
      provider: result.providerName,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      httpStatus: result.httpStatus ?? null,
      responseMeta: result.responseMeta ?? null,
      attempts: result.attempts.map((attempt) => ({
        providerName: attempt.providerName,
        success: attempt.success,
        errorCode: attempt.errorCode ?? null,
        errorMessage: attempt.errorMessage ?? null,
        retryable: attempt.retryable ?? null,
        httpStatus: attempt.httpStatus ?? null,
        responseMeta: attempt.responseMeta ?? null,
      })),
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
    const failedCount = counts.get("failed") ?? 0;
    const finalStatus =
      failedCount === 0 ? "completed" : sentCount === 0 ? "failed" : "partial";

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: finalStatus },
    });
  }
}
