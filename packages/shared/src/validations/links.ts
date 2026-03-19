import { z } from "zod";

export const trackedLinkStatusSchema = z.enum(["active", "disabled"]);
export const trackedLinkChannelSchema = z.enum(["sms", "email"]);

export const createTrackedLinkSchema = z.object({
  targetUrl: z.string().url("targetUrl must be a valid URL"),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "slug may only contain letters, numbers, - and _"
    )
    .optional(),
  campaignId: z.string().uuid().optional(),
  messageId: z.string().optional(),
  contactId: z.string().uuid().optional(),
  channel: trackedLinkChannelSchema.optional(),
  comment: z.string().max(500).optional(),
});
export type CreateTrackedLinkDto = z.infer<typeof createTrackedLinkSchema>;

export const updateTrackedLinkSchema = z
  .object({
    targetUrl: z.string().url("targetUrl must be a valid URL").optional(),
    status: trackedLinkStatusSchema.optional(),
  })
  .refine((value) => value.targetUrl || value.status, {
    message: "At least one field must be provided",
  });
export type UpdateTrackedLinkDto = z.infer<typeof updateTrackedLinkSchema>;

export const listTrackedLinksQuerySchema = z.object({
  campaignId: z.string().uuid().optional(),
  messageId: z.string().optional(),
  contactId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
  cursor: z.string().optional(),
});
export type ListTrackedLinksQuery = z.infer<typeof listTrackedLinksQuerySchema>;

export const trackedLinkResponseSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string(),
  sinkLinkId: z.string(),
  slug: z.string(),
  shortUrl: z.string().url(),
  targetUrl: z.string().url(),
  campaignId: z.string().uuid().nullable(),
  messageId: z.string().nullable(),
  contactId: z.string().uuid().nullable(),
  channel: trackedLinkChannelSchema.nullable(),
  status: trackedLinkStatusSchema,
  totalClicks: z.number().int().nullable(),
  uniqueClicks: z.number().int().nullable(),
  lastStatsSyncAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type TrackedLinkResponse = z.infer<typeof trackedLinkResponseSchema>;

export const trackedLinkStatsResponseSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string(),
  totalClicks: z.number().int().nullable(),
  uniqueClicks: z.number().int().nullable(),
  lastStatsSyncAt: z.date().nullable(),
});
export type TrackedLinkStatsResponse = z.infer<
  typeof trackedLinkStatsResponseSchema
>;

export const trackedLinkListResponseSchema = z.object({
  items: z.array(trackedLinkResponseSchema),
  nextCursor: z.string().nullable(),
});
export type TrackedLinkListResponse = z.infer<
  typeof trackedLinkListResponseSchema
>;
