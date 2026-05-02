import { z } from "zod";
import { billingPlanCodeSchema } from "./billing-catalog";

export const paymentKindSchema = z.enum(["subscription", "creditPurchase"]);
export const paymentProviderSchema = z.enum(["flutterwave", "stripe"]);
export const paymentMethodTypeSchema = z.enum([
  "card",
  "opay",
  "mobile_money",
  "ussd",
]);
export type PaymentProvider = z.infer<typeof paymentProviderSchema>;
export type PaymentMethodType = z.infer<typeof paymentMethodTypeSchema>;
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

const paymentSessionBaseSchema = z.object({
  kind: paymentKindSchema,
  organizationId: z.string().min(1, "organizationId is required"),
  currency: z
    .string()
    .trim()
    .min(3)
    .max(3)
    .transform((value) => value.toUpperCase()),
  planCode: billingPlanCodeSchema.optional(),
  creditsQuantity: z.number().int().positive().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createPaymentSessionSchema = paymentSessionBaseSchema.superRefine(
  (value, ctx) => {
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

    if (
      value.kind === "subscription" &&
      (value.planCode === "free" || value.planCode === "custom")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "This plan cannot be purchased through checkout",
        path: ["planCode"],
      });
    }
  }
);
export type CreatePaymentSessionDto = z.infer<
  typeof createPaymentSessionSchema
>;

export const paymentCustomerNameSchema = z.object({
  first: z.string().trim().min(1),
  last: z.string().trim().min(1),
});

export const paymentPhoneSchema = z.object({
  countryCode: z.string().trim().min(1),
  number: z.string().trim().min(1),
});

export const paymentAddressSchema = z.object({
  city: z.string().trim().min(1),
  country: z
    .string()
    .trim()
    .min(2)
    .max(2)
    .transform((value) => value.toUpperCase()),
  line1: z.string().trim().min(1),
  line2: z.string().trim().optional(),
  postalCode: z.string().trim().min(1),
  state: z.string().trim().min(1),
});

export const paymentCardSchema = z.object({
  number: z.string().trim().min(13).max(19),
  expiryMonth: z.string().trim().min(2).max(2),
  expiryYear: z.string().trim().min(2).max(4),
  cvv: z.string().trim().min(3).max(4),
  saveCard: z.boolean().optional(),
});

export const createDirectChargeSchema = paymentSessionBaseSchema
  .extend({
    amountMinor: z.number().int().positive().optional(),
    paymentMethodType: paymentMethodTypeSchema,
    customerName: paymentCustomerNameSchema,
    email: z.string().trim().email(),
    phone: paymentPhoneSchema,
    address: paymentAddressSchema.optional(),
    mobileMoneyNetwork: z.string().trim().min(1).optional(),
    accountBank: z.string().trim().min(1).optional(),
    card: paymentCardSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "creditPurchase" && !value.amountMinor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "amountMinor is required for credit purchases",
        path: ["amountMinor"],
      });
    }

    if (value.kind === "creditPurchase" && value.creditsQuantity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "creditsQuantity is derived from the entered amount for direct top ups",
        path: ["creditsQuantity"],
      });
    }

    if (value.kind === "subscription" && !value.planCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "planCode is required for subscription payments",
        path: ["planCode"],
      });
    }

    if (
      value.kind === "subscription" &&
      (value.planCode === "free" || value.planCode === "custom")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "This plan cannot be purchased through checkout",
        path: ["planCode"],
      });
    }

    if (value.paymentMethodType === "card" && !value.address) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "address is required for card payments",
        path: ["address"],
      });
    }
  });
export type CreateDirectChargeDto = z.infer<typeof createDirectChargeSchema>;

export const authorizeDirectChargeSchema = z
  .object({
    type: z.enum(["pin", "otp"]),
    pin: z.string().trim().min(4).max(12).optional(),
    otp: z.string().trim().min(4).max(10).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "pin" && !value.pin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "pin is required when type is pin",
        path: ["pin"],
      });
    }

    if (value.type === "otp" && !value.otp) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "otp is required when type is otp",
        path: ["otp"],
      });
    }
  });
export type AuthorizeDirectChargeDto = z.infer<
  typeof authorizeDirectChargeSchema
>;

export const reconcilePaymentSessionSchema = z.object({
  provider: paymentProviderSchema.optional(),
  providerReference: z.string().min(1).optional(),
  providerTransactionId: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  cancelled: z.boolean().optional(),
});
export type ReconcilePaymentSessionDto = z.infer<
  typeof reconcilePaymentSessionSchema
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
  provider: z.literal("flutterwave"),
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

export const paymentNextActionSchema = z.object({
  type: z.enum(["redirect_url", "payment_instruction"]),
  redirect_url: z
    .object({
      url: z.string().url(),
    })
    .optional(),
  payment_instruction: z
    .object({
      note: z.string(),
    })
    .optional(),
});
export type PaymentNextAction = z.infer<typeof paymentNextActionSchema>;

export const directChargeResponseSchema = z.object({
  success: z.literal(true),
  paymentSessionId: z.string().uuid(),
  next_action: paymentNextActionSchema.nullable().optional(),
  data: z.record(z.string(), z.unknown()).nullable().optional(),
});
export type DirectChargeResponse = z.infer<typeof directChargeResponseSchema>;

export const verifyDirectChargeResponseSchema = z.object({
  success: z.boolean(),
  status: paymentSessionStatusSchema,
  data: z.record(z.string(), z.unknown()).nullable().optional(),
  paymentSessionId: z.string().uuid(),
});
export type VerifyDirectChargeResponse = z.infer<
  typeof verifyDirectChargeResponseSchema
>;
