import { prisma } from "@reachdem/database";
import { CompositeSmseSender } from "./composite-sms-sender";
import { truncate } from "../utils/pii-scrubber";
import type { SmsExecutionJob } from "@reachdem/shared";
import { ActivityLogger } from "./activity-logger.service";

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

    if (!message.toE164) {
      await ActivityLogger.log({
        organizationId: job.organization_id,
        correlationId: message.correlationId,
        category: "sms",
        action: "send_failed",
        resourceType: "message",
        resourceId: message.id,
        status: "failed",
        meta: {
          message:
            "Message has no destination phone stored for worker execution",
        },
      });

      await prisma.message.update({
        where: { id: message.id },
        data: { status: "failed" },
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

    const baseAttemptNo = message.attempts.length;

    const result = await CompositeSmseSender.send(
      job.organization_id,
      message.correlationId,
      {
        to: message.toE164,
        text: message.text,
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

      return "sent";
    }

    if (job.delivery_cycle < 3) {
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
      },
    });

    return "failed";
  }
}
