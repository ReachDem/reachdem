import { Prisma, prisma } from "@reachdem/database";
import { ApiWebhookSubscriptionService } from "./api-webhook-subscription.service";
import { WebhookDeliveryService } from "./webhook-delivery.service";

type DbClient = typeof prisma | Prisma.TransactionClient;

export class MessageEventService {
  private static async resolveApiKeyId(
    db: DbClient,
    messageId: string,
    apiKeyId?: string | null
  ): Promise<string | null> {
    if (apiKeyId) return apiKeyId;

    const message = await db.message.findUnique({
      where: { id: messageId },
      select: { apiKeyId: true },
    });

    return message?.apiKeyId ?? null;
  }

  static async record(
    db: DbClient,
    input: {
      organizationId: string;
      messageId: string;
      type: string;
      status?: "scheduled" | "queued" | "sending" | "sent" | "failed" | null;
      payload?: Prisma.InputJsonValue;
    }
  ) {
    return db.messageEvent.create({
      data: {
        organizationId: input.organizationId,
        messageId: input.messageId,
        type: input.type,
        status: input.status ?? null,
        payload: input.payload ?? Prisma.JsonNull,
      },
    });
  }

  static async recordWithWebhookDelivery(
    db: DbClient,
    input: {
      organizationId: string;
      messageId: string;
      apiKeyId?: string | null;
      type: string;
      status?: "scheduled" | "queued" | "sending" | "sent" | "failed" | null;
      payload?: Prisma.InputJsonValue;
      webhookTargetUrls?: string[];
    }
  ) {
    const event = await this.record(db, input);
    const resolvedApiKeyId = await this.resolveApiKeyId(
      db,
      input.messageId,
      input.apiKeyId
    );

    const explicitTargets =
      input.webhookTargetUrls?.map((targetUrl) => ({
        apiKeyId: resolvedApiKeyId,
        targetUrl,
        signingSecret: null,
      })) ?? [];
    const resolvedTargets =
      explicitTargets.length > 0
        ? explicitTargets
        : await ApiWebhookSubscriptionService.resolveTargets(db, {
            organizationId: input.organizationId,
            apiKeyId: resolvedApiKeyId,
            eventType: input.type,
          });

    if (resolvedTargets.length > 0) {
      await Promise.all(
        resolvedTargets.map((target) =>
          WebhookDeliveryService.enqueue(db, {
            organizationId: input.organizationId,
            apiKeyId: target.apiKeyId,
            eventType: input.type,
            targetUrl: target.targetUrl,
            signingSecret: target.signingSecret,
            payload: {
              messageId: input.messageId,
              apiKeyId: resolvedApiKeyId,
              type: input.type,
              status: input.status ?? null,
              payload: input.payload ?? null,
              createdAt: event.createdAt.toISOString(),
            },
          })
        )
      );
    }

    return event;
  }

  static async recordStatusTransition(
    db: DbClient,
    input: {
      organizationId: string;
      messageId: string;
      apiKeyId?: string | null;
      status: "scheduled" | "queued" | "sending" | "sent" | "failed";
      payload?: Prisma.InputJsonValue;
      webhookTargetUrls?: string[];
    }
  ) {
    const typeByStatus = {
      queued: "message.accepted",
      sending: "message.accepted",
      sent: "message.sent",
      failed: "message.failed",
      scheduled: "message.accepted",
    } as const;

    return this.recordWithWebhookDelivery(db, {
      organizationId: input.organizationId,
      messageId: input.messageId,
      apiKeyId: input.apiKeyId ?? null,
      type: typeByStatus[input.status],
      status: input.status,
      payload: input.payload,
      webhookTargetUrls: input.webhookTargetUrls,
    });
  }
}
