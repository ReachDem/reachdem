import { z } from "zod";

export const billingPlanCodeSchema = z.enum([
  "free",
  "basic",
  "growth",
  "pro",
  "custom",
]);
export type BillingPlanCode = z.infer<typeof billingPlanCodeSchema>;

export const billingPlanSchema = z.object({
  code: billingPlanCodeSchema,
  name: z.string(),
  description: z.string(),
  priceMinor: z.number().int().nonnegative().nullable(),
  currency: z.string(),
  interval: z.enum(["monthly", "custom", "none"]),
  features: z.array(z.string()),
  highlighted: z.boolean(),
  contactSales: z.boolean(),
});
export type BillingPlan = z.infer<typeof billingPlanSchema>;

export const creditPricingTierSchema = z.object({
  minimumQuantity: z.number().int().positive(),
  unitAmountMinor: z.number().int().positive(),
  label: z.string(),
});
export type CreditPricingTier = z.infer<typeof creditPricingTierSchema>;

export const creditPricingSchema = z.object({
  currency: z.string(),
  minimumQuantity: z.number().int().positive(),
  tiers: z.array(creditPricingTierSchema).min(1),
});
export type CreditPricing = z.infer<typeof creditPricingSchema>;
