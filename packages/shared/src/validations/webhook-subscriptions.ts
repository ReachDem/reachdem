import { z } from "zod";

export const webhookEventTypeSchema = z.enum([
  "message.accepted",
  "message.sent",
  "message.delivered",
  "message.failed",
  "*",
]);

export const createWebhookSubscriptionSchema = z.object({
  targetUrl: z.string().url().max(2000),
  eventTypes: z.array(webhookEventTypeSchema).max(20).default(["*"]),
  active: z.boolean().optional(),
});

export const updateWebhookSubscriptionSchema = z
  .object({
    targetUrl: z.string().url().max(2000).optional(),
    eventTypes: z.array(webhookEventTypeSchema).max(20).optional(),
    active: z.boolean().optional(),
    rotateSigningSecret: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.targetUrl !== undefined ||
      value.eventTypes !== undefined ||
      value.active !== undefined ||
      value.rotateSigningSecret !== undefined,
    {
      message: "At least one field must be provided",
    }
  );

export const webhookSubscriptionResponseSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  apiKeyId: z.string().uuid(),
  targetUrl: z.string().url(),
  eventTypes: z.array(webhookEventTypeSchema),
  active: z.boolean(),
  hasSigningSecret: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const webhookSubscriptionSecretResponseSchema =
  webhookSubscriptionResponseSchema.extend({
    signingSecret: z.string(),
  });

export type CreateWebhookSubscriptionDto = z.infer<
  typeof createWebhookSubscriptionSchema
>;
export type UpdateWebhookSubscriptionDto = z.infer<
  typeof updateWebhookSubscriptionSchema
>;
