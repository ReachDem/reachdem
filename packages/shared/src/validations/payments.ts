import { z } from "zod";

export const paymentKindSchema = z.enum(["subscription", "creditPurchase"]);
export const paymentProviderSchema = z.enum(["flutterwave", "stripe"]);
export type PaymentProvider = z.infer<typeof paymentProviderSchema>;
export const paymentSessionStatusSchema = z.enum([
  "pending",
  "providerRedirected",
  "processing",
  "succeeded",
  "failed",
  "cancelled",
  "expired",
]);
export const paymentTransactionStatusSchema = z.enum([
  "initiated",
  "pending",
  "processing",
  "succeeded",
  "failed",
  "cancelled",
  "refunded",
]);
export type PaymentKind = z.infer<typeof paymentKindSchema>;
export type PaymentSessionStatus = z.infer<typeof paymentSessionStatusSchema>;
export type PaymentTransactionStatus = z.infer<
  typeof paymentTransactionStatusSchema
>;

export const createPaymentSessionSchema = z
  .object({
    kind: paymentKindSchema,
    organizationId: z.string().min(1, "organizationId is required"),
    currency: z
      .string()
      .trim()
      .min(3)
      .max(3)
      .transform((value) => value.toUpperCase()),
    planCode: z.string().min(1).max(100).optional(),
    creditsQuantity: z.number().int().positive().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "subscription" && !value.planCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "planCode is required for subscription payments",
        path: ["planCode"],
      });
    }

    if (value.kind === "creditPurchase" && !value.creditsQuantity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "creditsQuantity is required for credit purchases",
        path: ["creditsQuantity"],
      });
    }
  });
export type CreatePaymentSessionDto = z.infer<
  typeof createPaymentSessionSchema
>;

export const paymentSessionResponseSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string(),
  initiatedByUserId: z.string(),
  kind: paymentKindSchema,
  providerPrimary: paymentProviderSchema,
  providerSelected: paymentProviderSchema.nullable(),
  status: paymentSessionStatusSchema,
  currency: z.string(),
  amountMinor: z.number().int(),
  planCode: z.string().nullable(),
  creditsQuantity: z.number().int().nullable(),
  providerCheckoutUrl: z.string().url().nullable(),
  providerSessionId: z.string().nullable(),
  providerReference: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  activatedAt: z.coerce.date().nullable(),
  failedAt: z.coerce.date().nullable(),
  cancelledAt: z.coerce.date().nullable(),
  expiredAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type PaymentSessionResponse = z.infer<
  typeof paymentSessionResponseSchema
>;

export const paymentTransactionResponseSchema = z.object({
  id: z.string().uuid(),
  paymentSessionId: z.string().uuid(),
  organizationId: z.string(),
  initiatedByUserId: z.string().nullable(),
  provider: paymentProviderSchema,
  status: paymentTransactionStatusSchema,
  amountMinor: z.number().int(),
  currency: z.string(),
  providerTransactionId: z.string().nullable(),
  providerSessionId: z.string().nullable(),
  providerReference: z.string().nullable(),
  providerEventId: z.string().nullable(),
  rawStatus: z.string().nullable(),
  rawPayload: z.record(z.string(), z.unknown()).nullable(),
  confirmedAt: z.coerce.date().nullable(),
  failedAt: z.coerce.date().nullable(),
  cancelledAt: z.coerce.date().nullable(),
  refundedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type PaymentTransactionResponse = z.infer<
  typeof paymentTransactionResponseSchema
>;

export const paymentSessionDetailsResponseSchema = z.object({
  session: paymentSessionResponseSchema,
  transactions: z.array(paymentTransactionResponseSchema),
});
export type PaymentSessionDetailsResponse = z.infer<
  typeof paymentSessionDetailsResponseSchema
>;

export const createPaymentSessionResultSchema = z.object({
  paymentSessionId: z.string().uuid(),
  provider: paymentProviderSchema,
  status: paymentSessionStatusSchema,
  checkoutUrl: z.string().url().nullable(),
});
export type CreatePaymentSessionResult = z.infer<
  typeof createPaymentSessionResultSchema
>;

export const paymentWebhookAckSchema = z.object({
  ok: z.literal(true),
});
export type PaymentWebhookAck = z.infer<typeof paymentWebhookAckSchema>;
