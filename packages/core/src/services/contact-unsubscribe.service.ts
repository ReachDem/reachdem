import { Prisma, prisma } from "@reachdem/database";
import type {
  MessageChannel,
  ContactUnsubscribePreferences,
} from "@reachdem/shared";
import { ActivityLogger } from "./activity-logger.service";

const DEFAULT_PREFERENCES: ContactUnsubscribePreferences = {
  SMS: false,
  Email: false,
};

function channelKey(
  channel: MessageChannel
): keyof ContactUnsubscribePreferences {
  return channel === "sms" ? "SMS" : "Email";
}

function normalizeBoolean(value: unknown): boolean {
  return value === true;
}

export class ContactUnsubscribeService {
  static getDefaultPreferences(): ContactUnsubscribePreferences {
    return { ...DEFAULT_PREFERENCES };
  }

  static normalizePreferences(input: unknown): ContactUnsubscribePreferences {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return this.getDefaultPreferences();
    }

    const record = input as Record<string, unknown>;

    return {
      SMS: normalizeBoolean(record.SMS),
      Email: normalizeBoolean(record.Email),
    };
  }

  static toJsonValue(input: unknown): Prisma.InputJsonValue {
    return this.normalizePreferences(input) as unknown as Prisma.InputJsonValue;
  }

  static isUnsubscribed(input: unknown, channel: MessageChannel): boolean {
    const preferences = this.normalizePreferences(input);
    return preferences[channelKey(channel)];
  }

  static async findContactByChannelAddress(
    organizationId: string,
    channel: MessageChannel,
    address: string
  ) {
    const where =
      channel === "sms"
        ? { phoneE164: address }
        : { email: address.trim().toLowerCase() };

    return prisma.contact.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        ...where,
      },
    });
  }

  static async updateChannelPreference(params: {
    organizationId: string;
    contactId: string;
    channel: MessageChannel;
    unsubscribed: boolean;
    actorType?: "user" | "system" | "api_key";
    actorId?: string;
    source: string;
    reason?: string;
    messageId?: string | null;
    correlationId?: string;
  }) {
    const contact = await prisma.contact.findFirst({
      where: {
        id: params.contactId,
        organizationId: params.organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        organizationId: true,
        unsubscribe: true,
        email: true,
        phoneE164: true,
      },
    });

    if (!contact) {
      return null;
    }

    const next = this.normalizePreferences(contact.unsubscribe);
    next[channelKey(params.channel)] = params.unsubscribed;

    const updated = await prisma.contact.update({
      where: { id: contact.id },
      data: {
        unsubscribe: next as unknown as Prisma.InputJsonValue,
      },
    });

    await ActivityLogger.log({
      organizationId: params.organizationId,
      actorType: params.actorType ?? "system",
      actorId: params.actorId,
      category: "contacts",
      action: "updated",
      resourceType: "contact",
      resourceId: contact.id,
      status: "success",
      correlationId: params.correlationId,
      meta: {
        message: params.unsubscribed
          ? `Contact unsubscribed from ${params.channel}`
          : `Contact resubscribed to ${params.channel}`,
        channel: params.channel,
        source: params.source,
        reason: params.reason ?? null,
        messageId: params.messageId ?? null,
        unsubscribe: next,
        recipient:
          params.channel === "sms"
            ? (contact.phoneE164 ?? null)
            : (contact.email ?? null),
      },
    });

    return updated;
  }

  static async updateChannelPreferenceByAddress(params: {
    organizationId: string;
    channel: MessageChannel;
    address: string;
    unsubscribed: boolean;
    actorType?: "user" | "system" | "api_key";
    actorId?: string;
    source: string;
    reason?: string;
    messageId?: string | null;
    correlationId?: string;
  }) {
    const contact = await this.findContactByChannelAddress(
      params.organizationId,
      params.channel,
      params.address
    );

    if (!contact) {
      return null;
    }

    return this.updateChannelPreference({
      organizationId: params.organizationId,
      contactId: contact.id,
      channel: params.channel,
      unsubscribed: params.unsubscribed,
      actorType: params.actorType,
      actorId: params.actorId,
      source: params.source,
      reason: params.reason,
      messageId: params.messageId,
      correlationId: params.correlationId,
    });
  }
}
