import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  findCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  updateTarget: vi.fn(),
  log: vi.fn(),
  preprocessLinks: vi.fn(),
  getCampaignContent: vi.fn(),
  enqueueWhatsApp: vi.fn(),
}));

vi.mock("@reachdem/database", () => ({
  prisma: {
    campaign: {
      findFirst: mocked.findCampaign,
      update: mocked.updateCampaign,
    },
    campaignTarget: {
      update: mocked.updateTarget,
    },
  },
}));

vi.mock("./activity-logger.service", () => ({
  ActivityLogger: {
    log: mocked.log,
  },
}));

vi.mock("./campaign-link-tracking.service", () => ({
  CampaignLinkTrackingService: {
    preprocessCampaignLinks: mocked.preprocessLinks,
  },
}));

vi.mock("./campaign.service", () => ({
  CampaignService: {
    getCampaignContent: mocked.getCampaignContent,
  },
}));

vi.mock("./enqueue-whatsapp.usecase", () => ({
  EnqueueWhatsAppUseCase: {
    execute: mocked.enqueueWhatsApp,
  },
}));

import { ProcessCampaignLaunchJobUseCase } from "./process-campaign-launch-job.usecase";

describe("ProcessCampaignLaunchJobUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocked.findCampaign
      .mockResolvedValueOnce({
        id: "campaign_1",
        organizationId: "org_1",
        name: "WhatsApp blast",
        channel: "whatsapp",
        status: "running",
        scheduledAt: null,
      })
      .mockResolvedValueOnce({
        id: "campaign_1",
        organizationId: "org_1",
        name: "WhatsApp blast",
        channel: "whatsapp",
        status: "running",
        scheduledAt: null,
      });

    mocked.getCampaignContent.mockReturnValue({
      text: "Hello {{contact.name}}",
      from: "ReachDem WhatsApp",
    });

    mocked.enqueueWhatsApp.mockResolvedValue({
      message_id: "msg_1",
      status: "queued",
      correlation_id: "corr_1",
      idempotent: false,
    });

    vi.spyOn(
      ProcessCampaignLaunchJobUseCase as unknown as {
        resolveAndCreateTargets: (...args: unknown[]) => Promise<unknown>;
      },
      "resolveAndCreateTargets"
    ).mockResolvedValue([
      {
        id: "target_1",
        contactId: "contact_1",
        status: "pending",
        contact: {
          phoneE164: "+237699000000",
        },
      },
    ]);
  });

  it("fans out a WhatsApp campaign into WhatsApp message jobs", async () => {
    const publishWhatsAppJob = vi.fn().mockResolvedValue(undefined);

    const outcome = await ProcessCampaignLaunchJobUseCase.execute(
      {
        campaign_id: "campaign_1",
        organization_id: "org_1",
      },
      vi.fn(),
      vi.fn(),
      publishWhatsAppJob
    );

    expect(outcome).toBe("processed");
    expect(mocked.enqueueWhatsApp).toHaveBeenCalledWith(
      "org_1",
      expect.objectContaining({
        to: "+237699000000",
        text: "Hello {{contact.name}}",
        campaignId: "campaign_1",
      }),
      publishWhatsAppJob
    );
    expect(mocked.updateTarget).toHaveBeenCalledWith({
      where: { id: "target_1" },
      data: {
        messageId: "msg_1",
      },
    });
    expect(mocked.log).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_1",
        category: "whatsapp",
        resourceType: "campaign",
      })
    );
  });
});
