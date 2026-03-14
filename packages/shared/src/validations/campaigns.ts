import { z } from "zod";

// ─── Enums & Literals ────────────────────────────────────────────────────────
export const campaignStatusSchema = z.enum([
  "draft",
  "running",
  "partial",
  "completed",
  "failed",
]);
export const campaignChannelSchema = z.enum(["sms"]);
export const audienceSourceTypeSchema = z.enum(["group", "segment"]);
export const targetStatusSchema = z.enum([
  "pending",
  "sent",
  "failed",
  "skipped",
]);

// ─── DTOs for Creation & Update ────────────────────────────────────────────────
export const createCampaignSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  channel: campaignChannelSchema.default("sms"),
  content: z.string().min(1, "Content is required"),
  scheduledAt: z.coerce.date().optional(),
});
export type CreateCampaignDto = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = createCampaignSchema.partial();
export type UpdateCampaignDto = z.infer<typeof updateCampaignSchema>;

// ─── Audiences ───────────────────────────────────────────────────────────────
export const campaignAudienceInputSchema = z.object({
  sourceType: audienceSourceTypeSchema,
  sourceId: z.string().min(1, "Source ID is required"),
});
export type CampaignAudienceInput = z.infer<typeof campaignAudienceInputSchema>;

export const setCampaignAudienceSchema = z.object({
  audiences: z.array(campaignAudienceInputSchema),
});
export type SetCampaignAudienceDto = z.infer<typeof setCampaignAudienceSchema>;

// ─── Responses ───────────────────────────────────────────────────────────────
export interface CampaignResponse {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  channel: z.infer<typeof campaignChannelSchema>;
  status: z.infer<typeof campaignStatusSchema>;
  content: string;
  scheduledAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignListResponse {
  items: CampaignResponse[];
  nextCursor?: string | null;
}

export interface CampaignAudienceResponse {
  id: string;
  campaignId: string;
  sourceType: z.infer<typeof audienceSourceTypeSchema>;
  sourceId: string;
  createdAt: Date;
}
