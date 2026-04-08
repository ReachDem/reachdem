import { z } from "zod";

export const workspaceInitialBalanceEntrySchema = z.object({
  currency: z.string().trim().min(3).max(3),
  amountMinor: z.number().int().min(0),
});

export const workspaceInitialBalanceConfigSchema = z.object({
  entries: z.array(workspaceInitialBalanceEntrySchema),
  updatedAt: z.string().datetime().optional(),
  updatedBy: z.string().trim().min(1).nullable().optional(),
});

export type WorkspaceInitialBalanceEntry = z.infer<
  typeof workspaceInitialBalanceEntrySchema
>;
export type WorkspaceInitialBalanceConfig = z.infer<
  typeof workspaceInitialBalanceConfigSchema
>;
