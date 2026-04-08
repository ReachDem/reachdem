import { Prisma, prisma } from "@reachdem/database";

type DbClient = typeof prisma | Prisma.TransactionClient;

export class WebhookDeliveryService {
  static getNextAttemptAt(attemptCount: number, from = new Date()) {
    const delaySeconds = Math.min(3600, Math.max(30, 30 * 2 ** attemptCount));
    return new Date(from.getTime() + delaySeconds * 1000);
  }

  static async enqueue(
    db: DbClient,
    input: {
      organizationId: string;
      apiKeyId?: string | null;
      eventType: string;
      payload: Prisma.InputJsonValue;
      targetUrl: string;
      signingSecret?: string | null;
      nextAttemptAt?: Date | null;
    }
  ) {
    return db.webhookDelivery.create({
      data: {
        organizationId: input.organizationId,
        apiKeyId: input.apiKeyId ?? null,
        eventType: input.eventType,
        payload: input.payload,
        targetUrl: input.targetUrl,
        signingSecret: input.signingSecret ?? null,
        status: "pending",
        nextAttemptAt: input.nextAttemptAt ?? new Date(),
      },
    });
  }

  static async markDelivering(db: DbClient, id: string) {
    return db.webhookDelivery.update({
      where: { id },
      data: {
        status: "delivering",
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });
  }

  static async markDelivered(db: DbClient, id: string, statusCode: number) {
    return db.webhookDelivery.update({
      where: { id },
      data: {
        status: "delivered",
        lastStatusCode: statusCode,
        lastError: null,
      },
    });
  }

  static async markFailed(
    db: DbClient,
    input: {
      id: string;
      statusCode?: number | null;
      error: string;
      nextAttemptAt?: Date | null;
    }
  ) {
    return db.webhookDelivery.update({
      where: { id: input.id },
      data: {
        status: "failed",
        lastStatusCode: input.statusCode ?? null,
        lastError: input.error.slice(0, 500),
        nextAttemptAt: input.nextAttemptAt ?? null,
      },
    });
  }

  static async claimPendingBatch(
    db: DbClient,
    input: {
      limit: number;
      now?: Date;
    }
  ) {
    const now = input.now ?? new Date();
    const pending = await db.webhookDelivery.findMany({
      where: {
        status: {
          in: ["pending", "failed"],
        },
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
      },
      orderBy: { createdAt: "asc" },
      take: input.limit,
    });

    const claimed: typeof pending = [];
    for (const delivery of pending) {
      const result = await db.webhookDelivery.updateMany({
        where: {
          id: delivery.id,
          status: delivery.status,
        },
        data: {
          status: "delivering",
          attemptCount: {
            increment: 1,
          },
          lastAttemptAt: now,
        },
      });

      if (result.count === 1) {
        claimed.push({
          ...delivery,
          status: "delivering",
          attemptCount: delivery.attemptCount + 1,
          lastAttemptAt: now,
        });
      }
    }

    return claimed;
  }
}
