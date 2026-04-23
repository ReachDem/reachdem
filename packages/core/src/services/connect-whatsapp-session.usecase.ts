import type { WhatsAppSessionConnectResponse } from "@reachdem/shared";
import { ActivityLogger } from "./activity-logger.service";
import { EvolutionWhatsAppAdapter } from "../adapters/whatsapp/evolution-whatsapp.adapter";
import { OrganizationWhatsAppSessionService } from "./organization-whatsapp-session.service";

function getAppBaseUrl(): string | null {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    process.env.BETTER_AUTH_URL?.trim() ??
    null
  );
}

function buildWebhookUrl(): string | undefined {
  const baseUrl = getAppBaseUrl();
  if (!baseUrl) {
    return undefined;
  }

  const secret = process.env.EVOLUTION_WEBHOOK_SECRET?.trim();
  const url = new URL("/api/webhooks/evolution", baseUrl);

  if (secret) {
    url.searchParams.set("secret", secret);
  }

  return url.toString();
}

export class ConnectWhatsAppSessionUseCase {
  private static readonly WEBHOOK_EVENTS = [
    "QRCODE_UPDATED",
    "CONNECTION_UPDATE",
    "MESSAGES_UPDATE",
    "SEND_MESSAGE",
    "MESSAGES_UPSERT",
  ];

  static async execute(
    organizationId: string
  ): Promise<WhatsAppSessionConnectResponse> {
    if (process.env.EVOLUTION_ENABLED?.trim() === "false") {
      throw new Error("WhatsApp channel is disabled");
    }

    const adapter = new EvolutionWhatsAppAdapter();
    const session =
      await OrganizationWhatsAppSessionService.ensureSession(organizationId);
    const webhookUrl = buildWebhookUrl();
    const instanceExists = await adapter.instanceExists(session.instanceName);

    await ActivityLogger.log({
      organizationId,
      actorType: "system",
      actorId: "whatsapp-session-connect",
      category: "whatsapp",
      action: "updated",
      resourceType: "webhook",
      resourceId: session.instanceName,
      provider: adapter.providerName,
      status: "pending",
      meta: {
        message: "Starting WhatsApp session connection flow",
        instanceName: session.instanceName,
        webhookConfigured: Boolean(webhookUrl),
      },
    });

    if (!instanceExists) {
      await adapter.createInstance({
        instanceName: session.instanceName,
        webhookUrl,
        webhookEvents: this.WEBHOOK_EVENTS,
      });
    }

    if (webhookUrl) {
      await adapter.configureWebhook({
        instanceName: session.instanceName,
        webhookUrl,
        events: this.WEBHOOK_EVENTS,
      });
    }

    await OrganizationWhatsAppSessionService.markConnecting(organizationId);
    const connectResult = await adapter.connectInstance(session.instanceName);

    if (connectResult.qrCode) {
      await OrganizationWhatsAppSessionService.saveQrCode(
        organizationId,
        connectResult.qrCode
      );
    }

    const refreshedSession =
      (await OrganizationWhatsAppSessionService.getByOrganization(
        organizationId
      )) ?? session;

    await ActivityLogger.log({
      organizationId,
      actorType: "system",
      actorId: "whatsapp-session-connect",
      category: "whatsapp",
      action: "updated",
      resourceType: "webhook",
      resourceId: refreshedSession.instanceName,
      provider: adapter.providerName,
      status: "success",
      meta: {
        message: "WhatsApp session connection flow initialized",
        pairingCode: connectResult.pairingCode,
        hasQrCode: Boolean(connectResult.qrCode),
      },
    });

    return {
      session: refreshedSession,
      pairingCode: connectResult.pairingCode,
      qrCode: connectResult.qrCode,
    };
  }
}
