import { prisma } from "@reachdem/database";
import { createHash, randomUUID } from "crypto";
import type {
  EmailExecutionJob,
  SendEmailInput,
  SendSmsResult,
} from "@reachdem/shared";
import { MessagingEntitlementsService } from "./messaging-entitlements.service";

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
    const message = await prisma.$transaction(async (tx) => {
      if (!input.campaignId) {
        await MessagingEntitlementsService.reserveMessageSend(
          tx,
          organizationId,
          "email"
        );
      }

      return tx.message.create({
        data: {
          organizationId,
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
