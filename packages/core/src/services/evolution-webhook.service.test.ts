import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  findSession: vi.fn(),
  findMessage: vi.fn(),
  updateMessages: vi.fn(),
  saveQrCode: vi.fn(),
  markConnected: vi.fn(),
  markDisconnected: vi.fn(),
  markConnecting: vi.fn(),
  log: vi.fn(),
}));

vi.mock("@reachdem/database", () => ({
  prisma: {
    organizationWhatsAppSession: {
      findUnique: mocked.findSession,
    },
    message: {
      findFirst: mocked.findMessage,
      updateMany: mocked.updateMessages,
    },
  },
}));

vi.mock("./organization-whatsapp-session.service", () => ({
  OrganizationWhatsAppSessionService: {
    saveQrCode: mocked.saveQrCode,
    markConnected: mocked.markConnected,
    markDisconnected: mocked.markDisconnected,
    markConnecting: mocked.markConnecting,
  },
}));

vi.mock("./activity-logger.service", () => ({
  ActivityLogger: {
    log: mocked.log,
  },
}));

import { EvolutionWebhookService } from "./evolution-webhook.service";

describe("EvolutionWebhookService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EVOLUTION_WEBHOOK_SECRET = "webhook-secret";

    mocked.findSession.mockResolvedValue({
      organizationId: "org_1",
      instanceName: "staging-reachdem-org-abc12345",
    });
    mocked.findMessage.mockResolvedValue({
      id: "msg_1",
      correlationId: "corr_1",
    });
    mocked.updateMessages.mockResolvedValue({ count: 1 });
  });

  it("authorizes requests using the configured secret", () => {
    expect(
      EvolutionWebhookService.isAuthorized({
        rawSecret: null,
        headerSecret: "webhook-secret",
        bearerToken: null,
        queryToken: null,
      })
    ).toBe(true);

    expect(
      EvolutionWebhookService.isAuthorized({
        rawSecret: null,
        headerSecret: "wrong",
        bearerToken: null,
        queryToken: null,
      })
    ).toBe(false);
  });

  it("stores QR codes from QRCODE_UPDATED events", async () => {
    const outcome = await EvolutionWebhookService.process({
      event: "QRCODE_UPDATED",
      instanceName: "staging-reachdem-org-abc12345",
      data: {
        qrcode: "qr-base64",
      },
    });

    expect(outcome.accepted).toBe(true);
    expect(mocked.saveQrCode).toHaveBeenCalledWith("org_1", "qr-base64");
  });

  it("marks a session as connected on CONNECTION_UPDATE", async () => {
    await EvolutionWebhookService.process({
      event: "CONNECTION_UPDATE",
      instanceName: "staging-reachdem-org-abc12345",
      data: {
        status: "open",
        number: "+237699000000",
      },
    });

    expect(mocked.markConnected).toHaveBeenCalledWith("org_1", "+237699000000");
  });

  it("updates matching WhatsApp messages on outbound status webhook events", async () => {
    await EvolutionWebhookService.process({
      event: "MESSAGES_UPDATE",
      instanceName: "staging-reachdem-org-abc12345",
      data: {
        status: "delivered",
        key: {
          id: "provider-msg-1",
        },
      },
    });

    expect(mocked.findMessage).toHaveBeenCalledWith({
      where: {
        organizationId: "org_1",
        channel: "whatsapp",
        providerMessageId: "provider-msg-1",
      },
      select: {
        id: true,
        correlationId: true,
      },
    });
    expect(mocked.updateMessages).toHaveBeenCalledWith({
      where: {
        organizationId: "org_1",
        channel: "whatsapp",
        providerMessageId: "provider-msg-1",
      },
      data: {
        status: "sent",
      },
    });
    expect(mocked.log).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_1",
        category: "whatsapp",
        resourceType: "message",
        resourceId: "msg_1",
      })
    );
  });

  it("logs inbound messages but ignores them functionally", async () => {
    await EvolutionWebhookService.process({
      event: "MESSAGES_UPSERT",
      instanceName: "staging-reachdem-org-abc12345",
      data: {
        message: { conversation: "hello" },
      },
    });

    expect(mocked.updateMessages).not.toHaveBeenCalled();
    expect(mocked.log).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "whatsapp",
        resourceType: "webhook",
      })
    );
  });
});
