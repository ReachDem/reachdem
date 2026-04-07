import { z } from "zod";
import {
  billingPlanSchema,
  creditPricingSchema,
  messagePricingSchema,
} from "./billing-catalog";

export const workspaceBillingSummarySchema = z.object({
  organizationId: z.string(),
  planCode: z.string(),
  creditBalance: z.number().int().nonnegative(),
  creditCurrency: z.string(),
  workspaceVerificationStatus: z.enum([
    "not_submitted",
    "pending",
    "verified",
    "rejected",
  ]),
  workspaceVerifiedAt: z.coerce.date().nullable(),
  senderId: z.string().nullable(),
  smsQuotaUsed: z.number().int().nonnegative(),
  smsQuotaPeriodStartedAt: z.coerce.date().nullable(),
  emailQuotaUsed: z.number().int().nonnegative(),
  emailQuotaPeriodStartedAt: z.coerce.date().nullable(),
  smsIncludedLimit: z.number().int().nonnegative().nullable(),
  emailIncludedLimit: z.number().int().nonnegative().nullable(),
  smsQuotaRemaining: z.number().int().nonnegative().nullable(),
  emailQuotaRemaining: z.number().int().nonnegative().nullable(),
  usesSharedCredits: z.boolean(),
  availablePlans: z.array(billingPlanSchema),
  creditPricing: creditPricingSchema,
  messagePricing: messagePricingSchema,
});

export type WorkspaceBillingSummary = z.infer<
  typeof workspaceBillingSummarySchema
>;
