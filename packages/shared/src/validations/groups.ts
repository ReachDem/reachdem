import { z } from "zod";

// Schema for creating and updating a group
export const groupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Group name is required")
    .max(120, "Group name cannot exceed 120 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),
});

export type CreateGroupInput = z.infer<typeof groupSchema>;
export type UpdateGroupInput = z.infer<typeof groupSchema>;

// Schema for bulk adding contact IDs to a group
export const bulkGroupMembersSchema = z.object({
  contact_ids: z
    .array(z.string().min(1, "Contact ID cannot be empty"))
    .min(1, "At least one contact ID is required")
    .max(10000, "Maximum limit of 10,000 contacts per bulk request exceeded"),
});

export type BulkGroupMembersInput = z.infer<typeof bulkGroupMembersSchema>;
