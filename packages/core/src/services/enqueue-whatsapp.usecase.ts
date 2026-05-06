import { prisma } from "@reachdem/database";
import { createHash, randomUUID } from "crypto";
import type {
  SendSmsResult,
  SendWhatsAppInput,
  WhatsAppExecutionJob,
} from "@reachdem/shared";
import { MessagingEntitlementsService } from "./messaging-entitlements.service";

function hashPhone(phone: string): string {
  return createHash("sha256").update(phone).digest("hex");
}

function last4(phone: string): string {
  return phone.replace(/\D/g, "").slice(-4);
}

export class EnqueueWhatsAppUseCase {
  static async execute(
    organizationId: string,
    input: SendWhatsAppInput,
    publish: (job: WhatsAppExecutionJob) => Promise<void>,
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
        await MessagingEntitlementsService.assertMessageSendAllowed(
          tx,
          organizationId,
          "whatsapp"
        );
      }

      return tx.message.create({
        data: {
          organizationId,
          apiKeyId: options.apiKeyId ?? null,
          campaignId: input.campaignId ?? null,
          channel: "whatsapp",
          toE164: input.to,
          toHashed: hashPhone(input.to),
          toLast4: last4(input.to),
          from: input.from ?? "ReachDem WhatsApp",
          text: input.text,
          status: input.scheduledAt ? "scheduled" : "queued",
          correlationId,
          idempotencyKey: input.idempotency_key,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        },
      });
    });

    if (!input.scheduledAt) {
      await publish({
        message_id: message.id,
        organization_id: organizationId,
        channel: "whatsapp",
        delivery_cycle: 1,
      });
    }

    return {
      message_id: message.id,
      status: input.scheduledAt ? "scheduled" : "queued",
      correlation_id: correlationId,
      idempotent: false,
    };
  }
}
