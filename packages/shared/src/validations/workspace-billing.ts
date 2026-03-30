import { z } from "zod";

export const workspaceBillingSummarySchema = z.object({
  organizationId: z.string(),
  planCode: z.string(),
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
  smsIncludedLimit: z.number().int().nonnegative().nullable(),
  emailIncludedLimit: z.number().int().nonnegative().nullable(),
  smsQuotaRemaining: z.number().int().nonnegative().nullable(),
  emailQuotaRemaining: z.number().int().nonnegative().nullable(),
  usesSharedCredits: z.boolean(),
});

export type WorkspaceBillingSummary = z.infer<
  typeof workspaceBillingSummarySchema
>;
