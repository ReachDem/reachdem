import { prisma } from "@reachdem/database";
import { randomUUID } from "crypto";
import { createHash } from "crypto";
import { CompositeSmseSender } from "./composite-sms-sender";
import { truncate } from "../utils/pii-scrubber";
import type { SendSmsInput, SendSmsResult } from "@reachdem/shared";

/** Hash a phone number for storage (SHA-256, hex) */
function hashPhone(phone: string): string {
  return createHash("sha256").update(phone).digest("hex");
}

/** Extract last 4 digits from an E.164 number */
function last4(phone: string): string {
  return phone.replace(/\D/g, "").slice(-4);
}

export class SendSmsUseCase {
  /**
   * Sends an SMS with full idempotency, attempt tracking, and fallback.
   *
   * If the same `idempotencyKey` is presented twice for the same workspace,
   * the existing message record is returned without re-sending.
   */
  static async execute(
    organizationId: string,
    input: SendSmsInput
  ): Promise<SendSmsResult> {
    // 1. Idempotency check
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

    // 2. Create Message record (status = queued)
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
        status: "queued",
        correlationId,
        idempotencyKey: input.idempotency_key,
      },
    });

    // 3. Delegate to the composite sender (handles primary → fallback)
    const result = await CompositeSmseSender.send(
      organizationId,
      correlationId,
      {
        to: input.to,
        text: input.text,
        from: input.from,
      }
    );

    for (const [index, attempt] of result.attempts.entries()) {
      await prisma.messageAttempt.create({
        data: {
          messageId: message.id,
          organizationId,
          provider: attempt.providerName,
          attemptNo: index + 1,
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

    // 5. Update Message status
    const finalStatus = result.success ? "sent" : "failed";
    await prisma.message.update({
      where: { id: message.id },
      data: {
        from: result.senderUsed,
        status: finalStatus,
        providerSelected: result.providerName,
      },
    });

    return {
      message_id: message.id,
      status: finalStatus,
      correlation_id: correlationId,
      idempotent: false,
    };
  }
}
