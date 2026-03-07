import { z } from "zod";

const dateString = z.coerce.date();

export const listActivitySchema = z.object({
  category: z
    .enum([
      "sms",
      "email",
      "whatsapp",
      "contacts",
      "links",
      "auth",
      "billing",
      "system",
    ])
    .optional(),
  severity: z.enum(["debug", "info", "warn", "error"]).optional(),
  status: z.enum(["success", "failed", "pending"]).optional(),
  provider: z.string().optional(),
  resource_id: z.string().optional(),
  from: dateString.optional(),
  to: dateString.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
});

export const providerSummarySchema = z
  .object({
    from: dateString,
    to: dateString,
  })
  .refine(
    (data) => {
      const diff = data.to.getTime() - data.from.getTime();
      return diff > 0 && diff <= 30 * 24 * 60 * 60 * 1000;
    },
    { message: "Date range must be positive and not exceed 30 days." }
  );

export const internalCreateEventSchema = z.object({
  organizationId: z.string().uuid(),
  actorType: z.enum(["user", "system", "api_key"]).optional(),
  actorId: z.string().optional(),
  category: z.enum([
    "sms",
    "email",
    "whatsapp",
    "contacts",
    "links",
    "auth",
    "billing",
    "system",
  ]),
  action: z.enum([
    "send_attempt",
    "send_success",
    "send_failed",
    "fallback",
    "provider_error",
    "rate_limit",
    "created",
    "updated",
    "deleted",
  ]),
  resourceType: z
    .enum(["message", "campaign", "segment", "group", "contact", "webhook"])
    .optional(),
  resourceId: z.string().optional(),
  provider: z.string().optional(),
  providerRequestId: z.string().optional(),
  correlationId: z.string().optional(),
  idempotencyKey: z.string().optional(),
  severity: z.enum(["debug", "info", "warn", "error"]).optional(),
  status: z.enum(["success", "failed", "pending"]),
  durationMs: z.number().int().nonnegative().optional(),
  meta: z.record(z.unknown()).optional(),
  expiresAt: dateString.optional(),
});
