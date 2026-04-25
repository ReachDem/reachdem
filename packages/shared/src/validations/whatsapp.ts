import { z } from "zod";

export const whatsappSessionStatusSchema = z.enum([
  "created",
  "connecting",
  "connected",
  "disconnected",
  "error",
]);

export const whatsappContentSchema = z.object({
  text: z.string().min(1, "WhatsApp text is required").max(4096),
  from: z.string().min(1).max(100).optional(),
});

export const sendWhatsAppSchema = z.object({
  to: z
    .string()
    .regex(
      /^\+[1-9]\d{7,14}$/,
      "Phone number must be in E.164 format (e.g. +2376XXXXXXXX)"
    ),
  text: z
    .string()
    .min(1, "Text cannot be empty")
    .max(4096, "Text cannot exceed 4096 characters"),
  from: z.string().min(1).max(100).optional(),
  idempotency_key: z
    .string()
    .min(1, "Idempotency key is required")
    .max(128, "Idempotency key cannot exceed 128 characters"),
  scheduledAt: z.string().datetime().optional(),
});

export const whatsappWebhookEventTypeSchema = z.enum([
  "QRCODE_UPDATED",
  "CONNECTION_UPDATE",
  "MESSAGES_UPDATE",
  "SEND_MESSAGE",
  "MESSAGES_UPSERT",
]);

export const whatsappSessionSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  provider: z.literal("evolution"),
  instanceName: z.string().min(1),
  status: whatsappSessionStatusSchema,
  phoneNumber: z.string().nullable().optional(),
  connectedAt: z.date().nullable().optional(),
  lastQrCode: z.string().nullable().optional(),
  lastError: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const whatsappSessionConnectResponseSchema = z.object({
  session: whatsappSessionSchema,
  pairingCode: z.string().nullable(),
  qrCode: z.string().nullable(),
});

export type WhatsAppContent = z.infer<typeof whatsappContentSchema>;
export type WhatsAppSessionStatus = z.infer<typeof whatsappSessionStatusSchema>;
export type WhatsAppSession = z.infer<typeof whatsappSessionSchema>;
export type WhatsAppSessionConnectResponse = z.infer<
  typeof whatsappSessionConnectResponseSchema
>;
