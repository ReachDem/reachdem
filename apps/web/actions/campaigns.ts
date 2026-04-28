"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@reachdem/auth";
import { headers } from "next/headers";
import {
  CampaignService,
  GroupService,
  SegmentService,
  RequestCampaignLaunchUseCase,
} from "@reachdem/core";
import { prisma } from "@reachdem/database";
import type {
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignResponse,
} from "@reachdem/shared";
import { publishCampaignLaunchJob } from "@/lib/publish-campaign-launch-job";

async function getOrganizationId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) throw new Error("Unauthorized");

  const organizationId = session.session?.activeOrganizationId;
  if (!organizationId) throw new Error("Organization selection required");

  return { organizationId, userId: session.user.id };
}

export type Campaign = CampaignResponse & {
  audienceGroups: string[];
  audienceSegments: string[];
};

export interface ListCampaignsOptions {
  limit?: number;
  cursor?: string;
}

export interface ListCampaignsResult {
  items: Campaign[];
  nextCursor?: string | null;
}

export async function getCampaigns(): Promise<Campaign[]> {
  try {
    const { organizationId } = await getOrganizationId();
    const response = await CampaignService.listCampaigns(organizationId);

    return response.items.map((c) => ({
      ...c,
      audienceGroups: [],
      audienceSegments: [],
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  } catch (error) {
    console.error("[getCampaigns] Error loading campaigns:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to load campaigns. Please try again."
    );
  }
}

/**
 * List campaigns with pagination support
 * @param options - Pagination options (limit, cursor)
 * @returns Paginated list of campaigns with nextCursor
 */
export async function listCampaigns(
  options: ListCampaignsOptions = {}
): Promise<ListCampaignsResult> {
  try {
    const { organizationId } = await getOrganizationId();
    const response = await CampaignService.listCampaigns(
      organizationId,
      options
    );

    const items = response.items.map((c) => ({
      ...c,
      audienceGroups: [],
      audienceSegments: [],
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return {
      items,
      nextCursor: response.nextCursor,
    };
  } catch (error) {
    console.error("[listCampaigns] Error loading campaigns:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to load campaigns. Please try again."
    );
  }
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const { organizationId } = await getOrganizationId();
  const campaign = await CampaignService.getCampaign(organizationId, id);
  if (!campaign) return null;

  const audiences = await CampaignService.getAudiences(organizationId, id);

  const audienceGroups = audiences
    .filter((a) => a.sourceType === "group")
    .map((a) => a.sourceId);

  const audienceSegments = audiences
    .filter((a) => a.sourceType === "segment")
    .map((a) => a.sourceId);

  return {
    ...campaign,
    audienceGroups,
    audienceSegments,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
}

export async function createCampaign(data: {
  name: string;
  description: string | null;
  channel: "sms" | "email";
  content: CreateCampaignDto["content"];
  audienceGroups: string[];
  audienceSegments: string[];
}) {
  const { campaign } = await createCampaignWithAudience(data);

  revalidatePath("/campaigns");
  return { success: true, data: campaign };
}

type CreateCampaignWithAudienceInput = {
  name: string;
  description: string | null;
  channel: "sms" | "email";
  content: CreateCampaignDto["content"];
  audienceGroups: string[];
  audienceSegments: string[];
  scheduledAt?: string | Date;
};

async function createCampaignWithAudience(
  data: CreateCampaignWithAudienceInput
) {
  const { organizationId, userId } = await getOrganizationId();
  let campaign: CampaignResponse | null = null;

  try {
    const payload: CreateCampaignDto = {
      name: data.name,
      description: data.description ?? undefined,
      channel: data.channel,
      content: data.content,
      ...(data.scheduledAt ? { scheduledAt: new Date(data.scheduledAt) } : {}),
    };

    campaign = await CampaignService.createCampaign(
      organizationId,
      payload,
      userId
    );

    const audiences = [
      ...data.audienceGroups.map((id) => ({
        sourceType: "group" as const,
        sourceId: id,
      })),
      ...data.audienceSegments.map((id) => ({
        sourceType: "segment" as const,
        sourceId: id,
      })),
    ];

    await CampaignService.setAudiences(organizationId, campaign.id, {
      audiences,
    });

    await associateLinksWithCampaign(organizationId, campaign.id, data.content);

    return { organizationId, campaign };
  } catch (error) {
    if (campaign) {
      await prisma.campaign.deleteMany({
        where: {
          id: campaign.id,
          organizationId,
          status: "draft",
        },
      });
    }

    throw error;
  }
}

export async function createAndScheduleCampaign(
  data: CreateCampaignWithAudienceInput & { scheduledAt: string | Date }
) {
  const { campaign } = await createCampaignWithAudience(data);

  revalidatePath("/campaigns");

  return { success: true, data: campaign };
}

export async function createAndLaunchCampaign(
  data: CreateCampaignWithAudienceInput
) {
  const { organizationId, campaign } = await createCampaignWithAudience(data);

  try {
    await RequestCampaignLaunchUseCase.execute(
      organizationId,
      campaign.id,
      publishCampaignLaunchJob
    );

    revalidatePath("/campaigns");
    return { success: true, data: campaign };
  } catch (error) {
    await prisma.campaign.deleteMany({
      where: {
        id: campaign.id,
        organizationId,
        status: "draft",
      },
    });

    throw error;
  }
}

// Helper function to associate existing rcdm.ink links with campaign
async function associateLinksWithCampaign(
  organizationId: string,
  campaignId: string,
  content: any
): Promise<void> {
  // Extract text content
  let textContent = "";
  if (content?.text) {
    textContent = content.text;
  } else if (content?.html) {
    textContent = content.html;
  }

  if (!textContent) return;

  // Find all rcdm.ink links (already shortened)
  const rcdmLinkRegex = /rcdm\.ink\/([a-zA-Z0-9]{4})/g;
  const matches = Array.from(textContent.matchAll(rcdmLinkRegex));
  if (matches.length === 0) return;

  const slugs = [...new Set(matches.map((match) => match[1]))];

  try {
    await prisma.trackedLink.updateMany({
      where: {
        organizationId,
        slug: { in: slugs },
        campaignId: null,
      },
      data: {
        campaignId,
      },
    });
  } catch (error) {
    console.error(
      `Failed to associate tracked links with campaign ${campaignId}:`,
      error
    );
  }
}

export async function updateCampaign(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    channel?: "sms" | "email";
    content?: UpdateCampaignDto["content"];
    audienceGroups?: string[];
    audienceSegments?: string[];
  }
) {
  const { organizationId } = await getOrganizationId();

  const payload: UpdateCampaignDto = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.description !== undefined)
    payload.description = data.description ?? undefined;
  if (data.channel !== undefined)
    payload.channel = data.channel as "sms" | "email";
  if (data.content !== undefined) payload.content = data.content;

  const updatedCampaign = await CampaignService.updateCampaign(
    organizationId,
    id,
    payload
  );

  // Associate existing tracked links with this campaign if content was updated
  if (data.content) {
    await associateLinksWithCampaign(organizationId, id, data.content);
  }

  if (data.audienceGroups || data.audienceSegments) {
    const audiences = await CampaignService.getAudiences(organizationId, id);
    const existingGroups = audiences
      .filter((a) => a.sourceType === "group")
      .map((a) => a.sourceId);
    const existingSegments = audiences
      .filter((a) => a.sourceType === "segment")
      .map((a) => a.sourceId);

    const newGroups = data.audienceGroups || existingGroups;
    const newSegments = data.audienceSegments || existingSegments;

    const audiencePayload = [
      ...newGroups.map((g_id) => ({
        sourceType: "group" as const,
        sourceId: g_id,
      })),
      ...newSegments.map((s_id) => ({
        sourceType: "segment" as const,
        sourceId: s_id,
      })),
    ];

    await CampaignService.setAudiences(organizationId, id, {
      audiences: audiencePayload,
    });
  }

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}/edit`);

  return { success: true, data: updatedCampaign };
}

export async function deleteCampaign(id: string) {
  const { organizationId } = await getOrganizationId();
  await CampaignService.deleteCampaign(organizationId, id, {
    allowUnsafeDelete: process.env.NODE_ENV === "development",
  });
  revalidatePath("/campaigns");
  return { success: true };
}

export async function launchCampaign(id: string) {
  const { organizationId } = await getOrganizationId();
  await RequestCampaignLaunchUseCase.execute(
    organizationId,
    id,
    publishCampaignLaunchJob
  );
  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}/edit`);
  return { success: true };
}

export async function getAudienceGroups() {
  const { organizationId } = await getOrganizationId();
  const groups = await GroupService.getGroups(organizationId, { limit: 100 });
  return groups.data.map((g) => ({ id: g.id, name: g.name }));
}

export async function getAudienceSegments() {
  const { organizationId } = await getOrganizationId();
  const segments = await SegmentService.getSegments(organizationId, {
    limit: 100,
  });
  return segments.items.map((s) => ({ id: s.id, name: s.name }));
}

/**
 * Get campaign statistics
 */
export async function getCampaignStats(campaignId: string) {
  try {
    const { organizationId } = await getOrganizationId();
    const { CampaignStatsService } = await import("@reachdem/core");
    return await CampaignStatsService.getCampaignStats(
      organizationId,
      campaignId
    );
  } catch (error) {
    console.error("[getCampaignStats] Error:", error);
    throw error;
  }
}

/**
 * Get tracked links for a campaign
 */
export async function getCampaignLinks(campaignId: string) {
  try {
    const { organizationId } = await getOrganizationId();
    const { TrackedLinkService } = await import("@reachdem/core");
    const result = await TrackedLinkService.listLinks(organizationId, {
      campaignId,
      limit: 100,
    });
    return result.items;
  } catch (error) {
    console.error("[getCampaignLinks] Error:", error);
    return [];
  }
}

/**
 * Get campaign targets (messages sent to contacts)
 */
export async function getCampaignTargets(
  campaignId: string,
  options: {
    page?: number;
    pageSize?: number;
    search?: string;
  } = {}
) {
  try {
    const { organizationId } = await getOrganizationId();
    const { page = 1, pageSize = 50, search = "" } = options;

    // Using Prisma directly for now since there's no service method
    const { prisma } = await import("@reachdem/database");

    const where: any = {
      campaignId,
      organizationId,
    };

    if (search) {
      where.contact = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phoneE164: { contains: search } },
        ],
      };
    }

    const [targets, totalCount] = await Promise.all([
      prisma.campaignTarget.findMany({
        where,
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneE164: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.campaignTarget.count({ where }),
    ]);

    return {
      targets: targets.map((t) => ({
        id: t.id,
        contactId: t.contactId,
        contactName: t.contact.name,
        contactEmail: t.contact.email,
        contactPhone: t.contact.phoneE164,
        resolvedTo: t.resolvedTo,
        status: t.status,
        messageId: t.messageId,
        createdAt: t.createdAt,
      })),
      totalCount,
      page,
      pageSize,
    };
  } catch (error) {
    console.error("[getCampaignTargets] Error:", error);
    return {
      targets: [],
      totalCount: 0,
      page: 1,
      pageSize: 50,
    };
  }
}

export async function duplicateCampaign(id: string) {
  try {
    const { organizationId, userId } = await getOrganizationId();
    const existing = await CampaignService.getCampaign(organizationId, id);
    if (!existing) throw new Error("Campaign not found");

    const audiences = await CampaignService.getAudiences(organizationId, id);

    const payload: CreateCampaignDto = {
      name: `${existing.name} (Copy)`,
      description: existing.description ?? undefined,
      channel: existing.channel as "sms" | "email",
      content: existing.content,
    };

    const newCampaign = await CampaignService.createCampaign(
      organizationId,
      payload,
      userId
    );

    await CampaignService.setAudiences(organizationId, newCampaign.id, {
      audiences: audiences.map((a) => ({
        sourceType: a.sourceType,
        sourceId: a.sourceId,
      })),
    });

    if (existing.content) {
      await associateLinksWithCampaign(
        organizationId,
        newCampaign.id,
        existing.content
      );
    }

    revalidatePath("/campaigns");
    return { success: true, data: newCampaign };
  } catch (error) {
    console.error("[duplicateCampaign] Error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to duplicate campaign"
    );
  }
}

const DEFAULT_SENDER_ID = "ReachDem";

export async function getOrgSmsConfig(): Promise<{
  effectiveSenderId: string;
  isCustom: boolean;
  verificationStatus:
    | "not_submitted"
    | "pending"
    | "verified"
    | "rejected"
    | null;
}> {
  try {
    const { organizationId } = await getOrganizationId();
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        senderId: true,
        workspaceVerificationStatus: true,
      },
    });

    const isVerified = org?.workspaceVerificationStatus === "verified";
    const hasCustomSender = isVerified && Boolean(org?.senderId);

    return {
      effectiveSenderId: hasCustomSender ? org!.senderId! : DEFAULT_SENDER_ID,
      isCustom: hasCustomSender,
      verificationStatus:
        (org?.workspaceVerificationStatus as any) ?? "not_submitted",
    };
  } catch {
    return {
      effectiveSenderId: DEFAULT_SENDER_ID,
      isCustom: false,
      verificationStatus: null,
    };
  }
}
