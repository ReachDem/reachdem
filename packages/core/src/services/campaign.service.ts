import { prisma } from "@reachdem/database";
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  SetCampaignAudienceDto,
  CampaignResponse,
  CampaignListResponse,
  CampaignAudienceResponse,
} from "@reachdem/shared";

export class CampaignService {
  /**
   * List campaigns for a workspace (paginated)
   */
  static async listCampaigns(
    organizationId: string,
    options: { limit?: number; cursor?: string } = {}
  ): Promise<CampaignListResponse> {
    const limit = options.limit || 50;

    const campaigns = await prisma.campaign.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(options.cursor && {
        cursor: { id: options.cursor },
        skip: 1, // Skip cursor
      }),
    });

    let nextCursor: string | null = null;
    if (campaigns.length > limit) {
      const nextItem = campaigns.pop();
      nextCursor = nextItem!.id;
    }

    return {
      items: campaigns.map(this.mapToResponse),
      nextCursor,
    };
  }

  /**
   * Get a single campaign
   */
  static async getCampaign(
    organizationId: string,
    id: string
  ): Promise<CampaignResponse | null> {
    const campaign = await prisma.campaign.findUnique({
      where: { id, organizationId },
    });

    if (!campaign) return null;

    return this.mapToResponse(campaign);
  }

  /**
   * Create a new draft campaign
   */
  static async createCampaign(
    organizationId: string,
    data: CreateCampaignDto,
    userId?: string
  ): Promise<CampaignResponse> {
    const campaign = await prisma.campaign.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description || null,
        channel: data.channel as "sms",
        status: "draft",
        content: data.content,
        scheduledAt: data.scheduledAt || null,
        createdBy: userId || null,
      },
    });

    return this.mapToResponse(campaign);
  }

  /**
   * Update an existing campaign (only allowed if status is 'draft')
   */
  static async updateCampaign(
    organizationId: string,
    id: string,
    data: UpdateCampaignDto
  ): Promise<CampaignResponse> {
    const campaign = await prisma.campaign.findUnique({
      where: { id, organizationId },
    });

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.status !== "draft") {
      throw new Error(`Cannot update campaign in status '${campaign.status}'`);
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        channel: data.channel as "sms",
        content: data.content,
        scheduledAt: data.scheduledAt,
      },
    });

    return this.mapToResponse(updated);
  }

  /**
   * Delete a campaign (only allowed if status is 'draft')
   */
  static async deleteCampaign(
    organizationId: string,
    id: string
  ): Promise<void> {
    const campaign = await prisma.campaign.findUnique({
      where: { id, organizationId },
    });

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.status !== "draft") {
      throw new Error(`Cannot delete campaign in status '${campaign.status}'`);
    }

    await prisma.campaign.delete({
      where: { id },
    });
  }

  /**
   * Get audiences attached to a campaign
   */
  static async getAudiences(
    organizationId: string,
    campaignId: string
  ): Promise<CampaignAudienceResponse[]> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, organizationId },
    });

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    const audiences = await prisma.campaignAudience.findMany({
      where: { campaignId, organizationId },
      orderBy: { createdAt: "asc" },
    });

    return audiences.map((a) => ({
      id: a.id,
      campaignId: a.campaignId,
      sourceType: a.sourceType,
      sourceId: a.sourceId,
      createdAt: a.createdAt,
    }));
  }

  /**
   * Replace the audience for a campaign (only allowed if status is 'draft')
   * This is a complete sync: deletes existing, inserts new
   */
  static async setAudiences(
    organizationId: string,
    campaignId: string,
    data: SetCampaignAudienceDto
  ): Promise<CampaignAudienceResponse[]> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, organizationId },
      include: { audiences: true },
    });

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.status !== "draft") {
      throw new Error(
        `Cannot modify audience of campaign in status '${campaign.status}'`
      );
    }

    const uniquePayload = Array.from(
      new Map(
        data.audiences.map((item) => [
          `${item.sourceType}-${item.sourceId}`,
          item,
        ])
      ).values()
    );

    await this.validateAudienceSources(organizationId, uniquePayload);

    // Wrap in a transaction to ensure atomic replacement
    await prisma.$transaction(async (tx) => {
      // 1. Delete all existing audiences
      await tx.campaignAudience.deleteMany({
        where: { campaignId },
      });

      // 2. Create new ones
      if (uniquePayload.length > 0) {
        await tx.campaignAudience.createMany({
          data: uniquePayload.map((input) => ({
            campaignId,
            organizationId,
            sourceType: input.sourceType,
            sourceId: input.sourceId,
          })),
        });
      }
    });

    return this.getAudiences(organizationId, campaignId);
  }

  private static async validateAudienceSources(
    organizationId: string,
    audiences: SetCampaignAudienceDto["audiences"]
  ): Promise<void> {
    const groupIds = audiences
      .filter((audience) => audience.sourceType === "group")
      .map((audience) => audience.sourceId);
    const segmentIds = audiences
      .filter((audience) => audience.sourceType === "segment")
      .map((audience) => audience.sourceId);

    if (groupIds.length > 0) {
      const groups = await prisma.group.findMany({
        where: {
          id: { in: groupIds },
          organizationId,
        },
        select: { id: true },
      });

      if (groups.length !== new Set(groupIds).size) {
        throw new Error(
          "Cannot modify audience with groups outside this workspace"
        );
      }
    }

    if (segmentIds.length > 0) {
      const segments = await prisma.segment.findMany({
        where: {
          id: { in: segmentIds },
          organizationId,
        },
        select: { id: true },
      });

      if (segments.length !== new Set(segmentIds).size) {
        throw new Error(
          "Cannot modify audience with segments outside this workspace"
        );
      }
    }
  }

  /**
   * Mapper correctly formatting the database model to external representation
   */
  private static mapToResponse(campaign: any): CampaignResponse {
    return {
      id: campaign.id,
      organizationId: campaign.organizationId,
      name: campaign.name,
      description: campaign.description,
      channel: campaign.channel,
      status: campaign.status,
      content: campaign.content,
      scheduledAt: campaign.scheduledAt,
      createdBy: campaign.createdBy,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };
  }
}
