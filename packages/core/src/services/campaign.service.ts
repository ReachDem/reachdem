import { prisma, type Campaign } from "@reachdem/database";
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  SetCampaignAudienceDto,
  CampaignResponse,
  CampaignListResponse,
  CampaignAudienceResponse,
  type CampaignContent,
  type EmailCampaignContent,
  type SmsCampaignContent,
  parseCampaignContent,
} from "@reachdem/shared";
import {
  CampaignAudienceValidationError,
  CampaignInvalidStatusError,
  CampaignNotFoundError,
} from "../errors/campaign.errors";

export class CampaignService {
  private static getSafeString(
    value: unknown,
    fallback: string,
    maxLength?: number
  ): string {
    if (typeof value !== "string") {
      return fallback;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return fallback;
    }

    return maxLength ? trimmed.slice(0, maxLength) : trimmed;
  }

  static getCampaignContent(campaign: {
    channel: "sms" | "email";
    content: unknown;
  }): SmsCampaignContent | EmailCampaignContent {
    try {
      return parseCampaignContent(campaign.channel, campaign.content);
    } catch (error) {
      const rawContent =
        campaign.content && typeof campaign.content === "object"
          ? (campaign.content as Record<string, unknown>)
          : {};

      if (campaign.channel === "sms") {
        return {
          text: this.getSafeString(
            rawContent.text,
            "Error loading content",
            1600
          ),
          ...(typeof rawContent.from === "string" && rawContent.from.trim()
            ? { from: rawContent.from.trim().slice(0, 20) }
            : {}),
          ...(typeof rawContent.senderId === "string" &&
          rawContent.senderId.trim()
            ? { senderId: rawContent.senderId.trim().slice(0, 20) }
            : {}),
        } as SmsCampaignContent;
      }

      return {
        subject: this.getSafeString(
          rawContent.subject,
          "Error loading content",
          200
        ),
        html: this.getSafeString(
          rawContent.html,
          "<p>Error loading content</p>",
          200000
        ),
        ...(typeof rawContent.from === "string" && rawContent.from.trim()
          ? { from: rawContent.from.trim() }
          : {}),
        ...(rawContent.bodyJson !== undefined
          ? { bodyJson: rawContent.bodyJson }
          : {}),
        ...(rawContent.mode === "visual" ||
        rawContent.mode === "html" ||
        rawContent.mode === "react"
          ? { mode: rawContent.mode }
          : {}),
        ...(typeof rawContent.fontFamily === "string" &&
        rawContent.fontFamily.trim()
          ? { fontFamily: rawContent.fontFamily.trim().slice(0, 200) }
          : {}),
        ...(Array.isArray(rawContent.fontWeights)
          ? {
              fontWeights: rawContent.fontWeights.filter(
                (value): value is number =>
                  typeof value === "number" &&
                  Number.isInteger(value) &&
                  value > 0
              ),
            }
          : {}),
      } as EmailCampaignContent;
    }
  }

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
      items: campaigns.map((campaign) => this.mapToResponse(campaign)),
      nextCursor,
    };
  }

  static async claimScheduledCampaigns(input: { until: Date; limit: number }) {
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: "draft",
        scheduledAt: {
          not: null,
          lte: input.until,
        },
      },
      orderBy: { scheduledAt: "asc" },
      take: input.limit,
      select: {
        id: true,
        organizationId: true,
        channel: true,
        scheduledAt: true,
      },
    });

    const claimed: typeof campaigns = [];

    for (const campaign of campaigns) {
      const result = await prisma.campaign.updateMany({
        where: {
          id: campaign.id,
          status: "draft",
        },
        data: {
          status: "running",
        },
      });

      if (result.count === 1) {
        claimed.push(campaign);
      }
    }

    return {
      updated: claimed.length,
      items: claimed,
    };
  }

  static async revertScheduledCampaignClaim(id: string) {
    return prisma.campaign.updateMany({
      where: {
        id,
        status: "running",
        scheduledAt: {
          not: null,
        },
      },
      data: {
        status: "draft",
      },
    });
  }

  /**
   * Get a single campaign
   */
  static async getCampaign(
    organizationId: string,
    id: string
  ): Promise<CampaignResponse | null> {
    const campaign = await prisma.campaign.findFirst({
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
    userId?: string,
    options?: { apiKeyId?: string }
  ): Promise<CampaignResponse> {
    const campaign = await prisma.campaign.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description || null,
        channel: data.channel as any,
        status: "draft",
        content: data.content as any,
        scheduledAt: data.scheduledAt || null,
        createdBy: userId || null,
        apiKeyId: options?.apiKeyId || null,
      } as any,
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
    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId },
    });

    if (!campaign) {
      throw new CampaignNotFoundError();
    }

    if (campaign.status !== "draft") {
      throw new CampaignInvalidStatusError(
        `Cannot update campaign in status '${campaign.status}'`
      );
    }

    const nextChannel = data.channel ?? campaign.channel;
    const nextContent = data.content ?? campaign.content;
    parseCampaignContent(nextChannel, nextContent);

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        channel: data.channel as any,
        ...(data.content && { content: data.content as any }),
        scheduledAt: data.scheduledAt,
      } as any,
    });

    return this.mapToResponse(updated);
  }

  /**
   * Delete a campaign (only allowed if status is 'draft')
   */
  static async deleteCampaign(
    organizationId: string,
    id: string,
    options?: {
      allowUnsafeDelete?: boolean;
    }
  ): Promise<void> {
    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId },
    });

    if (!campaign) {
      throw new CampaignNotFoundError();
    }

    if (campaign.status !== "draft" && !options?.allowUnsafeDelete) {
      throw new CampaignInvalidStatusError(
        `Cannot delete campaign in status '${campaign.status}'`
      );
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
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
    });

    if (!campaign) {
      throw new CampaignNotFoundError();
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
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
      include: { audiences: true },
    });

    if (!campaign) {
      throw new CampaignNotFoundError();
    }

    if (campaign.status !== "draft") {
      throw new CampaignInvalidStatusError(
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
        throw new CampaignAudienceValidationError(
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
        throw new CampaignAudienceValidationError(
          "Cannot modify audience with segments outside this workspace"
        );
      }
    }
  }

  /**
   * Mapper correctly formatting the database model to external representation
   */
  private static mapToResponse(campaign: Campaign): CampaignResponse {
    return {
      id: campaign.id,
      organizationId: campaign.organizationId,
      name: campaign.name,
      description: campaign.description,
      channel: campaign.channel,
      status: campaign.status,
      content: CampaignService.getCampaignContent(
        campaign as any
      ) as CampaignContent,
      scheduledAt: campaign.scheduledAt,
      createdBy: campaign.createdBy,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };
  }
}
