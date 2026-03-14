import { prisma } from "@reachdem/database";
import type { EmailExecutionJob } from "@reachdem/shared";
import { ActivityLogger } from "./activity-logger.service";
import { truncate } from "../utils/pii-scrubber";

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
    const result = await options.sendEmail({
      to: message.toEmail,
      subject: message.subject,
      html: message.html,
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

      return "sent";
    }

    if (job.delivery_cycle < 3) {
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
}
