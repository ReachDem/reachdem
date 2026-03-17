"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@reachdem/auth";
import { headers } from "next/headers";
import {
  CampaignService,
  GroupService,
  SegmentService,
  LaunchCampaignUseCase,
} from "@reachdem/core";
import type {
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignResponse,
} from "@reachdem/shared";
import { publishEmailJob } from "@/lib/publish-email-job";
import { publishSmsJob } from "@/lib/publish-sms-job";

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

export async function getCampaigns(): Promise<Campaign[]> {
  const { organizationId } = await getOrganizationId();
  const response = await CampaignService.listCampaigns(organizationId);

  return response.items.map((c) => ({
    ...c,
    audienceGroups: [],
    audienceSegments: [],
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
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
  channel: string;
  content: CreateCampaignDto["content"];
  audienceGroups: string[];
  audienceSegments: string[];
}) {
  const { organizationId, userId } = await getOrganizationId();

  const payload: CreateCampaignDto = {
    name: data.name,
    description: data.description ?? undefined,
    channel: data.channel as "sms" | "email",
    content: data.content,
  };

  const newCampaign = await CampaignService.createCampaign(
    organizationId,
    payload,
    userId
  );

  const audiencePayload = [
    ...data.audienceGroups.map((id) => ({
      sourceType: "group" as const,
      sourceId: id,
    })),
    ...data.audienceSegments.map((id) => ({
      sourceType: "segment" as const,
      sourceId: id,
    })),
  ];

  await CampaignService.setAudiences(organizationId, newCampaign.id, {
    audiences: audiencePayload,
  });

  revalidatePath("/campaigns");
  return { success: true, data: newCampaign };
}

export async function updateCampaign(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    channel?: string;
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
  await CampaignService.deleteCampaign(organizationId, id);
  revalidatePath("/campaigns");
  return { success: true };
}

export async function launchCampaign(id: string) {
  const { organizationId } = await getOrganizationId();
  await LaunchCampaignUseCase.execute(
    organizationId,
    id,
    publishSmsJob,
    publishEmailJob
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
