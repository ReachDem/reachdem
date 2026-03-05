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
    let attemptNo = 0;
    const now = Date.now();

    const result = await CompositeSmseSender.send(
      organizationId,
      correlationId,
      {
        to: input.to,
        text: input.text,
        from: input.from,
      }
    );

    attemptNo++;

    // 4. Record the MessageAttempt
    await prisma.messageAttempt.create({
      data: {
        messageId: message.id,
        organizationId,
        provider: result.providerName,
        attemptNo,
        status: result.success ? "sent" : "failed",
        providerMessageId: result.success ? result.providerMessageId : null,
        errorCode: result.success ? null : (result.errorCode ?? null),
        errorMessage: result.success
          ? null
          : truncate(result.errorMessage ?? "", 500),
        durationMs: Date.now() - now,
      },
    });

    // 5. Update Message status
    const finalStatus = result.success ? "sent" : "failed";
    await prisma.message.update({
      where: { id: message.id },
      data: {
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
