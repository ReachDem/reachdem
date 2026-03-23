import { z } from "zod";

// ─── Enums & Literals ────────────────────────────────────────────────────────
export const campaignStatusSchema = z.enum([
  "draft",
  "running",
  "partial",
  "completed",
  "failed",
]);
export const campaignChannelSchema = z.enum(["sms", "email"]);
export const audienceSourceTypeSchema = z.enum(["group", "segment"]);
export const targetStatusSchema = z.enum([
  "pending",
  "sent",
  "failed",
  "skipped",
]);

export const smsCampaignContentSchema = z.object({
  text: z.string().min(1, "SMS text is required").max(1600),
  from: z
    .string()
    .min(1, "Sender ID is required")
    .max(20, "Sender ID cannot exceed 20 characters")
    .optional(),
});

export const emailCampaignContentSchema = z.object({
  subject: z
    .string()
    .min(1, "Email subject is required")
    .max(200, "Subject cannot exceed 200 characters"),
  html: z
    .string()
    .min(1, "Email HTML is required")
    .max(200000, "HTML cannot exceed 200000 characters"),
  from: z.string().min(1).max(200).optional(),
});

export const campaignContentSchema = z.union([
  smsCampaignContentSchema,
  emailCampaignContentSchema,
]);

export type SmsCampaignContent = z.infer<typeof smsCampaignContentSchema>;
export type EmailCampaignContent = z.infer<typeof emailCampaignContentSchema>;
export type CampaignContent = z.infer<typeof campaignContentSchema>;

export function parseCampaignContent(
  channel: z.infer<typeof campaignChannelSchema>,
  content: unknown
): SmsCampaignContent | EmailCampaignContent {
  return channel === "sms"
    ? smsCampaignContentSchema.parse(content)
    : emailCampaignContentSchema.parse(content);
}

// ─── DTOs for Creation & Update ────────────────────────────────────────────────
export const createCampaignSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100, "Name is too long"),
    description: z.string().max(500, "Description is too long").optional(),
    channel: campaignChannelSchema.default("sms"),
    content: campaignContentSchema,
    scheduledAt: z.coerce.date().optional(),
  })
  .superRefine((value, ctx) => {
    const schema =
      value.channel === "sms"
        ? smsCampaignContentSchema
        : emailCampaignContentSchema;
    const parsed = schema.safeParse(value.content);
    if (!parsed.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid campaign content for selected channel",
        path: ["content"],
      });
    }
  });
export type CreateCampaignDto = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  channel: campaignChannelSchema.optional(),
  content: campaignContentSchema.optional(),
  scheduledAt: z.coerce.date().nullable().optional(),
});
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
  content: CampaignContent;
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

export interface CampaignStatsResponse {
  campaignId: string;
  audienceSize: number;
  sentCount: number;
  failedCount: number;
  clickCount: number;
  uniqueClickCount: number;
}
