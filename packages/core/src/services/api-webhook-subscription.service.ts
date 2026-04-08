import { randomBytes } from "crypto";
import { Prisma, prisma } from "@reachdem/database";
import type {
  CreateWebhookSubscriptionDto,
  UpdateWebhookSubscriptionDto,
} from "@reachdem/shared";

type DbClient = typeof prisma | Prisma.TransactionClient;

export type ResolvedWebhookTarget = {
  apiKeyId: string;
  targetUrl: string;
  signingSecret: string | null;
};

export class ApiWebhookSubscriptionService {
  private static normalizeEventTypes(eventTypes: string[]): string[] {
    return Array.from(new Set(eventTypes.length > 0 ? eventTypes : ["*"]));
  }

  static generateSigningSecret(): string {
    return randomBytes(32).toString("base64url");
  }

  static async listForApiKey(
    db: DbClient,
    input: { organizationId: string; apiKeyId: string }
  ) {
    const subscriptions = await db.apiWebhookSubscription.findMany({
      where: {
        organizationId: input.organizationId,
        apiKeyId: input.apiKeyId,
      },
      orderBy: { createdAt: "asc" },
    });

    return subscriptions.map((subscription) => ({
      id: subscription.id,
      organizationId: subscription.organizationId,
      apiKeyId: subscription.apiKeyId,
      targetUrl: subscription.targetUrl,
      eventTypes: subscription.eventTypes,
      active: subscription.active,
      hasSigningSecret: Boolean(subscription.signingSecret),
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    }));
  }

  static async createForApiKey(
    db: DbClient,
    input: {
      organizationId: string;
      apiKeyId: string;
      data: CreateWebhookSubscriptionDto;
    }
  ) {
    const signingSecret = this.generateSigningSecret();
    const subscription = await db.apiWebhookSubscription.create({
      data: {
        organizationId: input.organizationId,
        apiKeyId: input.apiKeyId,
        targetUrl: input.data.targetUrl,
        eventTypes: this.normalizeEventTypes(input.data.eventTypes),
        active: input.data.active ?? true,
        signingSecret,
      },
    });

    return {
      ...subscription,
      hasSigningSecret: true,
      signingSecret,
    };
  }

  static async updateForApiKey(
    db: DbClient,
    input: {
      organizationId: string;
      apiKeyId: string;
      subscriptionId: string;
      data: UpdateWebhookSubscriptionDto;
    }
  ) {
    const existing = await db.apiWebhookSubscription.findFirst({
      where: {
        id: input.subscriptionId,
        organizationId: input.organizationId,
        apiKeyId: input.apiKeyId,
      },
    });

    if (!existing) {
      return null;
    }

    const rotatedSigningSecret = input.data.rotateSigningSecret
      ? this.generateSigningSecret()
      : null;

    const updated = await db.apiWebhookSubscription.update({
      where: { id: existing.id },
      data: {
        ...(input.data.targetUrl !== undefined
          ? { targetUrl: input.data.targetUrl }
          : {}),
        ...(input.data.eventTypes !== undefined
          ? { eventTypes: this.normalizeEventTypes(input.data.eventTypes) }
          : {}),
        ...(input.data.active !== undefined
          ? { active: input.data.active }
          : {}),
        ...(rotatedSigningSecret
          ? { signingSecret: rotatedSigningSecret }
          : {}),
      },
    });

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      apiKeyId: updated.apiKeyId,
      targetUrl: updated.targetUrl,
      eventTypes: updated.eventTypes,
      active: updated.active,
      hasSigningSecret: Boolean(updated.signingSecret),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      ...(rotatedSigningSecret ? { signingSecret: rotatedSigningSecret } : {}),
    };
  }

  static async deleteForApiKey(
    db: DbClient,
    input: {
      organizationId: string;
      apiKeyId: string;
      subscriptionId: string;
    }
  ): Promise<boolean> {
    const result = await db.apiWebhookSubscription.deleteMany({
      where: {
        id: input.subscriptionId,
        organizationId: input.organizationId,
        apiKeyId: input.apiKeyId,
      },
    });

    return result.count === 1;
  }

  static async resolveTargets(
    db: DbClient,
    input: {
      organizationId: string;
      apiKeyId?: string | null;
      eventType: string;
    }
  ): Promise<ResolvedWebhookTarget[]> {
    if (!input.apiKeyId) {
      return [];
    }

    const subscriptions = await db.apiWebhookSubscription.findMany({
      where: {
        organizationId: input.organizationId,
        apiKeyId: input.apiKeyId,
        active: true,
      },
      select: {
        apiKeyId: true,
        targetUrl: true,
        signingSecret: true,
        eventTypes: true,
      },
    });

    return subscriptions
      .filter((subscription) => {
        if (subscription.eventTypes.length === 0) {
          return true;
        }
        return (
          subscription.eventTypes.includes("*") ||
          subscription.eventTypes.includes(input.eventType)
        );
      })
      .map((subscription) => ({
        apiKeyId: subscription.apiKeyId,
        targetUrl: subscription.targetUrl,
        signingSecret: subscription.signingSecret ?? null,
      }));
  }
}
