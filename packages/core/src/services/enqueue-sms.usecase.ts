import { prisma } from "@reachdem/database";
import { randomUUID, createHash } from "crypto";
import type {
  SendSmsInput,
  SendSmsResult,
  SmsExecutionJob,
} from "@reachdem/shared";

function hashPhone(phone: string): string {
  return createHash("sha256").update(phone).digest("hex");
}

function last4(phone: string): string {
  return phone.replace(/\D/g, "").slice(-4);
}

export class EnqueueSmsUseCase {
  static async execute(
    organizationId: string,
    input: SendSmsInput,
    publish: (job: SmsExecutionJob) => Promise<void>
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
    const message = await prisma.message.create({
      data: {
        organizationId,
        campaignId: input.campaignId ?? null,
        toE164: input.to,
        toHashed: hashPhone(input.to),
        toLast4: last4(input.to),
        from: input.from,
        text: input.text,
        status: input.scheduledAt ? "scheduled" : "queued",
        correlationId,
        idempotencyKey: input.idempotency_key,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      },
    });

    const job: SmsExecutionJob = {
      message_id: message.id,
      organization_id: organizationId,
      channel: "sms",
      delivery_cycle: 1,
    };

    if (!input.scheduledAt) {
      await publish(job);
    }

    return {
      message_id: message.id,
      status: input.scheduledAt ? "scheduled" : "queued",
      correlation_id: correlationId,
      idempotent: false,
    };
  }
}
