import { z } from "zod";

export const baseContactSchema = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters long"),
    phoneE164: z.string().trim().nullable().optional(),
    email: z.string().email("Invalid email format").nullable().optional(),
    gender: z.enum(["UNKNOWN", "MALE", "FEMALE", "OTHER"]).nullable().optional(),
    birthdate: z.coerce.date().nullable().optional(),
    address: z.string().nullable().optional(),
    work: z.string().nullable().optional(),
    enterprise: z.string().nullable().optional(),
    customFields: z.record(z.string(), z.any()).nullable().optional(),
});

export const createContactSchema = baseContactSchema.refine(data => {
    const hasPhone = data.phoneE164 && data.phoneE164.length > 0;
    const hasEmail = data.email && data.email.length > 0;
    return hasPhone || hasEmail;
}, {
    message: "Either phone number or email depends on the other is required",
    path: ["phoneE164", "email"]
});

export const updateContactSchema = baseContactSchema.partial().refine(() => {
    // Note: The rule "either phone or email must exist" requires knowing the current DB state.
    // If the user tries to nullify the phone/email during an update, the API route must verify 
    // that they aren't deleting the *last* remaining contact method.
    return true;
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
