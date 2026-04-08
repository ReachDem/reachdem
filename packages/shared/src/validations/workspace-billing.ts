import { z } from "zod";
import { billingPlanSchema } from "./billing-catalog";

export const topUpConfigSchema = z.object({
  baseCurrency: z.string(),
  supportedCurrencies: z.array(z.string()).min(1),
  minimumAmountMinorByCurrency: z.record(
    z.string(),
    z.number().int().positive()
  ),
});

export const usagePricingSchema = z.object({
  currency: z.string(),
  smsUnitAmountMinor: z.number().int().positive(),
  emailUnitAmountMinor: z.number().int().positive(),
  freeTrialSmsLimit: z.number().int().nonnegative(),
  freeTrialBalanceMinor: z.number().int().nonnegative(),
});

export const workspaceBillingSummarySchema = z.object({
  organizationId: z.string(),
  planCode: z.string(),
  balanceMinor: z.number().int().nonnegative(),
  balanceCurrency: z.string(),
  creditBalance: z.number().int().nonnegative(),
  workspaceVerificationStatus: z.enum([
    "not_submitted",
    "pending",
    "verified",
    "rejected",
  ]),
  workspaceVerifiedAt: z.coerce.date().nullable(),
  senderId: z.string().nullable(),
  smsQuotaUsed: z.number().int().nonnegative(),
  emailQuotaUsed: z.number().int().nonnegative(),
  hasSuccessfulTopUp: z.boolean(),
  smsIncludedLimit: z.number().int().nonnegative().nullable(),
  emailIncludedLimit: z.number().int().nonnegative().nullable(),
  smsQuotaRemaining: z.number().int().nonnegative().nullable(),
  emailQuotaRemaining: z.number().int().nonnegative().nullable(),
  usesSharedCredits: z.boolean(),
  availablePlans: z.array(billingPlanSchema),
  topUpConfig: topUpConfigSchema,
  usagePricing: usagePricingSchema,
});

export type WorkspaceBillingSummary = z.infer<
  typeof workspaceBillingSummarySchema
>;
