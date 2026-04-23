import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  log: vi.fn(),
  ensureSession: vi.fn(),
  getByOrganization: vi.fn(),
  markConnecting: vi.fn(),
  saveQrCode: vi.fn(),
  createInstance: vi.fn(),
  configureWebhook: vi.fn(),
  connectInstance: vi.fn(),
}));

vi.mock("./activity-logger.service", () => ({
  ActivityLogger: {
    log: mocked.log,
  },
}));

vi.mock("./organization-whatsapp-session.service", () => ({
  OrganizationWhatsAppSessionService: {
    ensureSession: mocked.ensureSession,
    getByOrganization: mocked.getByOrganization,
    markConnecting: mocked.markConnecting,
    saveQrCode: mocked.saveQrCode,
  },
}));

vi.mock("../adapters/whatsapp/evolution-whatsapp.adapter", () => ({
  EvolutionWhatsAppAdapter: class {
    providerName = "evolution";
    createInstance = mocked.createInstance;
    configureWebhook = mocked.configureWebhook;
    connectInstance = mocked.connectInstance;
  },
}));

import { ConnectWhatsAppSessionUseCase } from "./connect-whatsapp-session.usecase";

describe("ConnectWhatsAppSessionUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EVOLUTION_ENABLED = "true";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.reachdem.test";
    process.env.EVOLUTION_WEBHOOK_SECRET = "secret";

    mocked.ensureSession.mockResolvedValue({
      id: "session_1",
      organizationId: "org_1",
      provider: "evolution",
      instanceName: "staging-reachdem-org-org_1",
      status: "created",
      phoneNumber: null,
      connectedAt: null,
      lastQrCode: null,
      lastError: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    });

    mocked.getByOrganization.mockResolvedValue({
      id: "session_1",
      organizationId: "org_1",
      provider: "evolution",
      instanceName: "staging-reachdem-org-org_1",
      status: "connecting",
      phoneNumber: null,
      connectedAt: null,
      lastQrCode: "qr-code",
      lastError: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:05:00Z"),
    });

    mocked.connectInstance.mockResolvedValue({
      pairingCode: "PAIR-1234",
      qrCode: "qr-code",
      attempts: 1,
    });
    mocked.createInstance.mockResolvedValue(undefined);
    mocked.configureWebhook.mockResolvedValue(undefined);
    mocked.markConnecting.mockResolvedValue(undefined);
    mocked.saveQrCode.mockResolvedValue(undefined);
    mocked.log.mockResolvedValue(undefined);
  });

  it("initializes a session, configures the webhook, and returns QR data", async () => {
    const result = await ConnectWhatsAppSessionUseCase.execute("org_1");

    expect(mocked.ensureSession).toHaveBeenCalledWith("org_1");
    expect(mocked.createInstance).toHaveBeenCalledWith({
      instanceName: "staging-reachdem-org-org_1",
      webhookUrl:
        "https://app.reachdem.test/api/webhooks/evolution?secret=secret",
      webhookEvents: [
        "QRCODE_UPDATED",
        "CONNECTION_UPDATE",
        "MESSAGES_UPDATE",
        "SEND_MESSAGE",
        "MESSAGES_UPSERT",
      ],
    });
    expect(mocked.configureWebhook).toHaveBeenCalledWith({
      instanceName: "staging-reachdem-org-org_1",
      webhookUrl:
        "https://app.reachdem.test/api/webhooks/evolution?secret=secret",
      events: [
        "QRCODE_UPDATED",
        "CONNECTION_UPDATE",
        "MESSAGES_UPDATE",
        "SEND_MESSAGE",
        "MESSAGES_UPSERT",
      ],
    });
    expect(mocked.markConnecting).toHaveBeenCalledWith("org_1");
    expect(mocked.saveQrCode).toHaveBeenCalledWith("org_1", "qr-code");
    expect(result).toEqual({
      session: expect.objectContaining({
        organizationId: "org_1",
        instanceName: "staging-reachdem-org-org_1",
        status: "connecting",
      }),
      pairingCode: "PAIR-1234",
      qrCode: "qr-code",
    });
    expect(mocked.log).toHaveBeenCalledTimes(2);
  });

  it("rejects when WhatsApp is disabled", async () => {
    process.env.EVOLUTION_ENABLED = "false";

    await expect(
      ConnectWhatsAppSessionUseCase.execute("org_1")
    ).rejects.toThrow("WhatsApp channel is disabled");
  });
});
