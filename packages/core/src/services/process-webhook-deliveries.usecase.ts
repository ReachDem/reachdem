import { prisma } from "@reachdem/database";
import { WebhookDeliveryService } from "./webhook-delivery.service";

type SendResult = {
  statusCode: number;
  error?: string | null;
};

export class ProcessWebhookDeliveriesUseCase {
  static async execute(input: {
    limit: number;
    now?: Date;
    send: (delivery: {
      id: string;
      eventType: string;
      payload: unknown;
      targetUrl: string;
      apiKeyId?: string | null;
      signingSecret?: string | null;
      attemptCount: number;
      organizationId: string;
    }) => Promise<SendResult>;
  }) {
    const claimed = await WebhookDeliveryService.claimPendingBatch(prisma, {
      limit: input.limit,
      now: input.now,
    });

    let delivered = 0;
    let failed = 0;

    for (const delivery of claimed) {
      try {
        const result = await input.send({
          id: delivery.id,
          eventType: delivery.eventType,
          payload: delivery.payload,
          targetUrl: delivery.targetUrl,
          apiKeyId: delivery.apiKeyId ?? null,
          signingSecret: delivery.signingSecret ?? null,
          attemptCount: delivery.attemptCount,
          organizationId: delivery.organizationId,
        });

        if (result.statusCode >= 200 && result.statusCode < 300) {
          await WebhookDeliveryService.markDelivered(
            prisma,
            delivery.id,
            result.statusCode
          );
          delivered += 1;
          continue;
        }

        await WebhookDeliveryService.markFailed(prisma, {
          id: delivery.id,
          statusCode: result.statusCode,
          error:
            result.error ??
            `Webhook delivery failed with status ${result.statusCode}`,
          nextAttemptAt: WebhookDeliveryService.getNextAttemptAt(
            delivery.attemptCount
          ),
        });
        failed += 1;
      } catch (error) {
        await WebhookDeliveryService.markFailed(prisma, {
          id: delivery.id,
          error:
            error instanceof Error ? error.message : "Webhook delivery failed",
          nextAttemptAt: WebhookDeliveryService.getNextAttemptAt(
            delivery.attemptCount
          ),
        });
        failed += 1;
      }
    }

    return {
      claimed: claimed.length,
      delivered,
      failed,
    };
  }
}
