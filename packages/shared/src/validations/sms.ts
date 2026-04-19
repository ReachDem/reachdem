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
    .max(160, "Text cannot exceed 160 characters (10 SMS segments)"),
  from: z
    .string()
    .min(1, "Sender ID is required")
    .max(20, "Sender ID cannot exceed 20 characters"),
  idempotency_key: z
    .string()
    .min(1, "Idempotency key is required")
    .max(128, "Idempotency key cannot exceed 128 characters"),
  scheduledAt: z.string().datetime().optional(),
});

export const sendEmailSchema = z.object({
  to: z.string().email("Recipient email must be valid"),
  subject: z
    .string()
    .min(1, "Subject cannot be empty")
    .max(200, "Subject cannot exceed 200 characters"),
  html: z
    .string()
    .min(1, "HTML cannot be empty")
    .max(200000, "HTML cannot exceed 200000 characters"),
  from: z.string().min(1).max(200).optional(),
  idempotency_key: z
    .string()
    .min(1, "Idempotency key is required")
    .max(128, "Idempotency key cannot exceed 128 characters"),
  scheduledAt: z.string().datetime().optional(),
});

export const listMessagesSchema = z.object({
  status: z
    .enum(["scheduled", "queued", "sending", "sent", "failed"])
    .optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
