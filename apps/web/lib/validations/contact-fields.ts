import { z } from "zod";

const baseObj = z.object({
    key: z.string().min(1, "Key is required").max(50, "Key is too long").regex(/^[a-zA-Z0-9_-]+$/, "Key can only contain letters, numbers, hyphens, and underscores"),
    label: z.string().min(1, "Label is required").max(100, "Label is too long"),
    type: z.enum(["TEXT", "NUMBER", "DATE", "BOOLEAN", "URL", "SELECT"]),
    options: z.array(z.string()).optional().nullable(),
});

export const createContactFieldSchema = baseObj.refine(data => {
    if (data.type === "SELECT") {
        return Array.isArray(data.options) && data.options.length > 0;
    }
    return true;
}, {
    message: "Options must be an array of strings for SELECT type",
    path: ["options"]
});

export const updateContactFieldSchema = baseObj.partial().omit({ key: true }).refine(data => {
    if (data.type === "SELECT") {
        return Array.isArray(data.options) && data.options.length > 0;
    }
    return true;
}, {
    message: "Options must be an array of strings for SELECT type",
    path: ["options"]
});

export type CreateContactFieldInput = z.infer<typeof createContactFieldSchema>;
export type UpdateContactFieldInput = z.infer<typeof updateContactFieldSchema>;
