import { z } from "zod";

export const sendSmsSchema = z.object({
  to: z
    .string()
    .regex(
      /^\+[1-9]\d{7,14}$/,
      "Phone number must be in E.164 format (e.g. +2376XXXXXXXX)"
    ),
  text: z
    .string()
    .min(1, "Text cannot be empty")
    .max(1600, "Text cannot exceed 1600 characters (10 SMS segments)"),
  from: z
    .string()
    .min(1, "Sender ID is required")
    .max(20, "Sender ID cannot exceed 20 characters"),
  idempotency_key: z
    .string()
    .min(1, "Idempotency key is required")
    .max(128, "Idempotency key cannot exceed 128 characters"),
});

export const listMessagesSchema = z.object({
  status: z.enum(["queued", "sending", "sent", "failed"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
