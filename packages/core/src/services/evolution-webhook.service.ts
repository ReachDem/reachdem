import { prisma } from "@reachdem/database";
import { ActivityLogger } from "./activity-logger.service";
import { OrganizationWhatsAppSessionService } from "./organization-whatsapp-session.service";

type EvolutionWebhookOutcome = {
  accepted: boolean;
  organizationId: string | null;
  instanceName: string | null;
  eventType: string | null;
};

function mapWebhookAction(status: string | null): "updated" | "send_failed" {
  const normalized = status?.toLowerCase();

  if (
    normalized === "failed" ||
    normalized === "error" ||
    normalized === "delivery_error" ||
    normalized === "message_error"
  ) {
    return "send_failed";
  }

  return "updated";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function extractEventType(payload: Record<string, unknown>): string | null {
  const raw =
    asString(payload.event) ??
    asString(payload.type) ??
    asString(payload.eventType) ??
    asString(asRecord(payload.data)?.event) ??
    null;

  if (!raw) {
    return null;
  }

  return raw.replace(/[.\-]/g, "_").toUpperCase();
}

function extractInstanceName(payload: Record<string, unknown>): string | null {
  return (
    asString(payload.instance) ??
    asString(payload.instanceName) ??
    asString(asRecord(payload.data)?.instance) ??
    asString(asRecord(payload.data)?.instanceName) ??
    asString(asRecord(payload.instance)?.instanceName) ??
    null
  );
}

function extractPhoneNumber(payload: Record<string, unknown>): string | null {
  const data = asRecord(payload.data);
  const connection = asRecord(data?.connection);
  return (
    asString(connection?.phone) ??
    asString(data?.number) ??
    asString(data?.phone) ??
    asString(payload.number) ??
    null
  );
}

function extractProviderMessageId(
  payload: Record<string, unknown>
): string | null {
  const data = asRecord(payload.data);
  const key = asRecord(data?.key);
  const message = asRecord(data?.message);
  return (
    asString(key?.id) ??
    asString(data?.messageId) ??
    asString(data?.id) ??
    asString(message?.id) ??
    null
  );
}

function extractStatus(payload: Record<string, unknown>): string | null {
  const data = asRecord(payload.data);
  const statusRecord = asRecord(data?.status);
  const connectionRecord = asRecord(data?.connection);
  return (
    asString(data?.status) ??
    asString(statusRecord?.status) ??
    asString(connectionRecord?.state) ??
    asString(connectionRecord?.status) ??
    asString(payload.status) ??
    null
  );
}

function isInboundEvent(eventType: string | null): boolean {
  return eventType === "MESSAGES_UPSERT";
}

function normalizeStatus(status: string | null): "sent" | "failed" | null {
  const normalized = status?.toLowerCase();
  if (!normalized) return null;

  if (
    [
      "accepted",
      "sent",
      "delivered",
      "delivery_ack",
      "read",
      "read_ack",
    ].includes(normalized)
  ) {
    return "sent";
  }

  if (
    ["failed", "error", "delivery_error", "message_error"].includes(normalized)
  ) {
    return "failed";
  }

  return null;
}

export class EvolutionWebhookService {
  private static normalizeSecret(value: string | null): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    return trimmed;
  }

  static isAuthorized(args: {
    rawSecret: string | null;
    headerSecret: string | null;
    bearerToken: string | null;
    queryToken: string | null;
  }): boolean {
    const expected = this.normalizeSecret(
      process.env.EVOLUTION_WEBHOOK_SECRET?.trim() ?? null
    );
    if (!expected) {
      return false;
    }

    return (
      this.normalizeSecret(args.rawSecret) === expected ||
      this.normalizeSecret(args.headerSecret) === expected ||
      this.normalizeSecret(args.bearerToken) === expected ||
      this.normalizeSecret(args.queryToken) === expected
    );
  }

  static async process(payload: unknown): Promise<EvolutionWebhookOutcome> {
    const record = asRecord(payload);
    if (!record) {
      return {
        accepted: false,
        organizationId: null,
        instanceName: null,
        eventType: null,
      };
    }

    const instanceName = extractInstanceName(record);
    const eventType = extractEventType(record);

    if (!instanceName) {
      return {
        accepted: false,
        organizationId: null,
        instanceName: null,
        eventType,
      };
    }

    const session = await prisma.organizationWhatsAppSession.findUnique({
      where: { instanceName },
      select: {
        organizationId: true,
        instanceName: true,
      },
    });

    if (!session) {
      return {
        accepted: false,
        organizationId: null,
        instanceName,
        eventType,
      };
    }

    if (eventType === "QRCODE_UPDATED") {
      const qrCode =
        asString(asRecord(record.data)?.qrcode) ??
        asString(asRecord(record.data)?.base64) ??
        asString(record.qrcode);

      if (qrCode) {
        await OrganizationWhatsAppSessionService.saveQrCode(
          session.organizationId,
          qrCode
        );
      }
    }

    if (eventType === "CONNECTION_UPDATE") {
      const status = extractStatus(record)?.toLowerCase();

      if (status === "open" || status === "connected") {
        await OrganizationWhatsAppSessionService.markConnected(
          session.organizationId,
          extractPhoneNumber(record) ?? undefined
        );
      } else if (status === "close" || status === "disconnected") {
        await OrganizationWhatsAppSessionService.markDisconnected(
          session.organizationId,
          extractStatus(record) ?? undefined
        );
      } else if (status === "connecting") {
        await OrganizationWhatsAppSessionService.markConnecting(
          session.organizationId
        );
      }
    }

    if (eventType === "MESSAGES_UPDATE" || eventType === "SEND_MESSAGE") {
      const providerMessageId = extractProviderMessageId(record);
      const providerStatus = extractStatus(record);
      const normalizedStatus = normalizeStatus(providerStatus);

      if (providerMessageId && normalizedStatus) {
        const message = await prisma.message.findFirst({
          where: {
            organizationId: session.organizationId,
            channel: "whatsapp",
            providerMessageId,
          },
          select: {
            id: true,
            correlationId: true,
          },
        });

        await prisma.message.updateMany({
          where: {
            organizationId: session.organizationId,
            channel: "whatsapp",
            providerMessageId,
          },
          data: {
            status: normalizedStatus,
          },
        });

        await ActivityLogger.log({
          organizationId: session.organizationId,
          correlationId: message?.correlationId,
          actorType: "system",
          actorId: "evolution-webhook",
          category: "whatsapp",
          action: mapWebhookAction(providerStatus),
          resourceType: "message",
          resourceId: message?.id ?? providerMessageId,
          provider: "evolution",
          status: normalizedStatus === "failed" ? "failed" : "success",
          meta: {
            message: `Evolution webhook processed ${eventType}`,
            eventType,
            providerMessageId,
            providerStatus,
            rawPayload: record,
          },
        });
      }
    }

    if (isInboundEvent(eventType)) {
      await ActivityLogger.log({
        organizationId: session.organizationId,
        actorType: "system",
        actorId: "evolution-webhook",
        category: "whatsapp",
        action: "updated",
        resourceType: "webhook",
        resourceId: session.instanceName,
        provider: "evolution",
        status: "success",
        meta: {
          message: "Inbound WhatsApp event received and ignored for MVP",
          eventType,
          rawPayload: record,
        },
      });
    }

    return {
      accepted: true,
      organizationId: session.organizationId,
      instanceName: session.instanceName,
      eventType,
    };
  }
}
