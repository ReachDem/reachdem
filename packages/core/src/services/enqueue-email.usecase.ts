import { prisma } from "@reachdem/database";
import { createHash, randomUUID } from "crypto";
import { nanoid } from "nanoid";
import type {
  EmailExecutionJob,
  SendEmailInput,
  SendSmsResult,
} from "@reachdem/shared";
import { MessagingEntitlementsService } from "./messaging-entitlements.service";
import { MessageEventService } from "./message-event.service";

function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

function last4Email(email: string): string {
  return email.trim().toLowerCase().slice(-4);
}

export class EnqueueEmailUseCase {
  static async execute(
    organizationId: string,
    input: SendEmailInput,
    publish: (job: EmailExecutionJob) => Promise<void>,
    options: {
      apiKeyId?: string | null;
      source?: "dashboard" | "publicApi" | "worker" | "system";
    } = {}
  ): Promise<SendSmsResult> {
    const existing = await prisma.message.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId,
          idempotencyKey: input.idempotency_key,
        },
      },
    });

    if (existing) {
      return {
        message_id: existing.id,
        status: existing.status,
        correlation_id: existing.correlationId,
        idempotent: true,
      };
    }

    const correlationId = randomUUID();
    const messageId = nanoid();
    const message = await prisma.$transaction(async (tx) => {
      const createdMessage = await tx.message.create({
        data: {
          id: messageId,
          organizationId,
          apiKeyId: options.apiKeyId ?? null,
          campaignId: input.campaignId ?? null,
          channel: "email",
          toEmail: input.to,
          toHashed: hashEmail(input.to),
          toLast4: last4Email(input.to),
          from: input.from ?? "ReachDem",
          subject: input.subject,
          html: input.html,
          status: input.scheduledAt ? "scheduled" : "queued",
          correlationId,
          idempotencyKey: input.idempotency_key,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        },
      });

      if (!input.campaignId) {
        await MessagingEntitlementsService.reserveMessageSend(
          tx,
          organizationId,
          "email",
          1,
          {
            apiKeyId: options.apiKeyId ?? null,
            messageId,
            source: options.source ?? "dashboard",
          }
        );
      }

      return createdMessage;
    });

    await MessageEventService.recordStatusTransition(prisma, {
      organizationId,
      messageId: message.id,
      apiKeyId: options.apiKeyId ?? null,
      status: input.scheduledAt ? "scheduled" : "queued",
      payload: {
        channel: "email",
        campaignId: input.campaignId ?? null,
      },
    });

    if (input.scheduledAt) {
      return {
        message_id: message.id,
        status: "scheduled",
        correlation_id: correlationId,
        idempotent: false,
      };
    }

    await publish({
      message_id: message.id,
      organization_id: organizationId,
      channel: "email",
      delivery_cycle: 1,
    });

    return {
      message_id: message.id,
      status: "queued",
      correlation_id: correlationId,
      idempotent: false,
    };
  }
}
