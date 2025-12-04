import { z } from "zod";

// ============================================
// Workspace Schemas
// ============================================

export const createWorkspaceSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase letters, numbers, and hyphens"
    ),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

// ============================================
// Contact Schemas
// ============================================

export const createContactSchema = z
  .object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    whatsapp: z.string().optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (data) => {
      const hasEmail = data.email && data.email.length > 0;
      const hasPhone = data.phone && data.phone.length > 0;
      const hasWhatsapp = data.whatsapp && data.whatsapp.length > 0;
      return hasEmail || hasPhone || hasWhatsapp;
    },
    {
      message: "At least one of email, phone, or whatsapp must be provided",
    }
  );

export type CreateContactInput = z.infer<typeof createContactSchema>;

export const contactSearchSchema = z.object({
  q: z.string().optional(),
});

export type ContactSearchInput = z.infer<typeof contactSearchSchema>;
