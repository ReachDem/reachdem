import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  findMessage: vi.fn(),
  updateMessage: vi.fn(),
  updateMany: vi.fn(),
  createAttempt: vi.fn(),
  findCampaignTarget: vi.fn(),
  updateCampaignTargetMany: vi.fn(),
  log: vi.fn(),
  ensureSession: vi.fn(),
  markError: vi.fn(),
  sendText: vi.fn(),
}));

vi.mock("@reachdem/database", () => ({
  prisma: {
    message: {
      findFirst: mocked.findMessage,
      update: mocked.updateMessage,
      updateMany: mocked.updateMany,
    },
    messageAttempt: {
      create: mocked.createAttempt,
    },
    campaignTarget: {
      findFirst: mocked.findCampaignTarget,
      updateMany: mocked.updateCampaignTargetMany,
    },
  },
}));

vi.mock("./activity-logger.service", () => ({
  ActivityLogger: {
    log: mocked.log,
  },
}));

vi.mock("./organization-whatsapp-session.service", () => ({
  OrganizationWhatsAppSessionService: {
    ensureSession: mocked.ensureSession,
    markError: mocked.markError,
  },
}));

vi.mock("../adapters/whatsapp/evolution-whatsapp.adapter", () => ({
  EvolutionWhatsAppAdapter: class {
    providerName = "evolution";
    sendText = mocked.sendText;
  },
}));

import { ProcessWhatsAppMessageJobUseCase } from "./process-whatsapp-message-job.usecase";

describe("ProcessWhatsAppMessageJobUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocked.findMessage.mockResolvedValue({
      id: "msg_1",
      organizationId: "org_1",
      channel: "whatsapp",
      toE164: "+237699000000",
      text: "Hello from ReachDem",
      from: "ReachDem WhatsApp",
      status: "queued",
      correlationId: "corr_1",
      campaignId: null,
      attempts: [],
    });
    mocked.updateMany.mockResolvedValue({ count: 1 });
    mocked.findCampaignTarget.mockResolvedValue(null);
    mocked.updateCampaignTargetMany.mockResolvedValue({ count: 0 });
    mocked.ensureSession.mockResolvedValue({
      instanceName: "staging-reachdem-org-org_1",
    });
    mocked.createAttempt.mockResolvedValue(undefined);
    mocked.log.mockResolvedValue(undefined);
  });

  it("sends a WhatsApp message successfully", async () => {
    mocked.sendText.mockResolvedValue({
      success: true,
      providerMessageId: "provider-msg-1",
      durationMs: 120,
      httpStatus: 201,
    });

    const outcome = await ProcessWhatsAppMessageJobUseCase.execute(
      {
        message_id: "msg_1",
        organization_id: "org_1",
        channel: "whatsapp",
        delivery_cycle: 1,
      },
      {
        republish: vi.fn(),
      }
    );

    expect(outcome).toBe("sent");
    expect(mocked.createAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          messageId: "msg_1",
          providerMessageId: "provider-msg-1",
          status: "sent",
        }),
      })
    );
    expect(mocked.updateMessage).toHaveBeenCalledWith({
      where: { id: "msg_1" },
      data: {
        status: "sent",
        providerSelected: "evolution",
        providerMessageId: "provider-msg-1",
      },
    });
    expect(mocked.updateCampaignTargetMany).toHaveBeenCalledWith({
      where: { messageId: "msg_1" },
      data: { status: "sent" },
    });
  });

  it("requeues retryable provider failures", async () => {
    const republish = vi.fn().mockResolvedValue(undefined);

    mocked.sendText.mockResolvedValue({
      success: false,
      errorCode: "provider_error",
      errorMessage: "temporary upstream issue",
      retryable: true,
      durationMs: 75,
    });

    const outcome = await ProcessWhatsAppMessageJobUseCase.execute(
      {
        message_id: "msg_1",
        organization_id: "org_1",
        channel: "whatsapp",
        delivery_cycle: 1,
      },
      { republish }
    );

    expect(outcome).toBe("requeued");
    expect(mocked.updateMessage).toHaveBeenCalledWith({
      where: { id: "msg_1" },
      data: {
        status: "queued",
        providerSelected: "evolution",
      },
    });
    expect(republish).toHaveBeenCalledWith({
      message_id: "msg_1",
      organization_id: "org_1",
      channel: "whatsapp",
      delivery_cycle: 2,
    });
  });

  it("marks campaign target failed after final provider failure", async () => {
    mocked.sendText.mockResolvedValue({
      success: false,
      errorCode: "provider_error",
      errorMessage: "recipient is invalid",
      retryable: false,
      durationMs: 75,
    });

    const outcome = await ProcessWhatsAppMessageJobUseCase.execute(
      {
        message_id: "msg_1",
        organization_id: "org_1",
        channel: "whatsapp",
        delivery_cycle: 3,
      },
      {
        republish: vi.fn(),
      }
    );

    expect(outcome).toBe("failed");
    expect(mocked.updateCampaignTargetMany).toHaveBeenCalledWith({
      where: { messageId: "msg_1" },
      data: { status: "failed" },
    });
  });

  it("releases the sending lock after technical failures", async () => {
    mocked.sendText.mockRejectedValue(new Error("Evolution unavailable"));

    await expect(
      ProcessWhatsAppMessageJobUseCase.execute(
        {
          message_id: "msg_1",
          organization_id: "org_1",
          channel: "whatsapp",
          delivery_cycle: 1,
        },
        {
          republish: vi.fn(),
        }
      )
    ).rejects.toThrow("Evolution unavailable");

    expect(mocked.updateMany).toHaveBeenLastCalledWith({
      where: {
        id: "msg_1",
        organizationId: "org_1",
        status: "sending",
      },
      data: {
        status: "queued",
      },
    });
  });
});
