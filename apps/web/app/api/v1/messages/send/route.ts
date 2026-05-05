import { NextResponse } from "next/server";
import { z } from "zod";
import { withPublicWorkspace } from "@reachdem/auth/guards";
import {
  EnqueueEmailUseCase,
  EnqueueSmsUseCase,
  EnqueueWhatsAppUseCase,
  MessageInsufficientCreditsError,
  MessageSendValidationError,
} from "@reachdem/core";
import {
  sendEmailSchema,
  sendSmsSchema,
  sendWhatsAppSchema,
} from "@reachdem/shared";
import { publishEmailJob } from "@/lib/queue/publish-email-job";
import { publishSmsJob } from "@/lib/queue/publish-sms-job";
import { publishWhatsAppJob } from "@/lib/queue/publish-whatsapp-job";

const publicSmsPayloadSchema = z.object({
  type: z.literal("transactional"),
  channel: z.literal("sms"),
  to: z.string(),
  text: z.string(),
  from: z.string().min(1).max(20).optional(),
  scheduledAt: z.string().datetime().optional(),
});

const publicEmailPayloadSchema = z.object({
  type: z.literal("transactional"),
  channel: z.literal("email"),
  to: z.string(),
  subject: z.string(),
  html: z.string(),
  from: z.string().min(1).max(200).optional(),
  scheduledAt: z.string().datetime().optional(),
});

const publicWhatsAppPayloadSchema = z.object({
  type: z.literal("transactional"),
  channel: z.literal("whatsapp"),
  to: z.string(),
  text: z.string(),
  from: z.string().min(1).max(100).optional(),
  scheduledAt: z.string().datetime().optional(),
});

const publicMessagePayloadSchema = z.discriminatedUnion("channel", [
  publicSmsPayloadSchema,
  publicEmailPayloadSchema,
  publicWhatsAppPayloadSchema,
]);

export const POST = withPublicWorkspace(
  async ({ req, organizationId, apiKeyId }) => {
    try {
      const idempotencyKey = req.headers.get("Idempotency-Key");

      if (!idempotencyKey) {
        return NextResponse.json(
          { error: "Idempotency-Key header is required" },
          { status: 400 }
        );
      }

      const body = await req.json();
      const parsedPublicPayload = publicMessagePayloadSchema.safeParse(body);

      if (!parsedPublicPayload.success) {
        return NextResponse.json(
          {
            error: "Invalid request body",
            details: parsedPublicPayload.error.flatten(),
          },
          { status: 400 }
        );
      }

      if (parsedPublicPayload.data.channel === "sms") {
        const parsedSms = sendSmsSchema.safeParse({
          ...parsedPublicPayload.data,
          from: parsedPublicPayload.data.from ?? "ReachDem",
          idempotency_key: idempotencyKey,
        });

        if (!parsedSms.success) {
          return NextResponse.json(
            {
              error: "Invalid request body",
              details: parsedSms.error.flatten(),
            },
            { status: 400 }
          );
        }

        const result = await EnqueueSmsUseCase.execute(
          organizationId,
          parsedSms.data,
          publishSmsJob,
          {
            apiKeyId,
            source: "publicApi",
          }
        );

        return NextResponse.json(result, {
          status: result.idempotent ? 200 : 201,
        });
      }

      if (parsedPublicPayload.data.channel === "whatsapp") {
        const parsedWhatsApp = sendWhatsAppSchema.safeParse({
          ...parsedPublicPayload.data,
          idempotency_key: idempotencyKey,
        });

        if (!parsedWhatsApp.success) {
          return NextResponse.json(
            {
              error: "Invalid request body",
              details: parsedWhatsApp.error.flatten(),
            },
            { status: 400 }
          );
        }

        const result = await EnqueueWhatsAppUseCase.execute(
          organizationId,
          parsedWhatsApp.data,
          publishWhatsAppJob,
          {
            apiKeyId,
            source: "publicApi",
          }
        );

        return NextResponse.json(result, {
          status: result.idempotent ? 200 : 201,
        });
      }

      const parsedEmail = sendEmailSchema.safeParse({
        ...parsedPublicPayload.data,
        idempotency_key: idempotencyKey,
      });

      if (!parsedEmail.success) {
        return NextResponse.json(
          {
            error: "Invalid request body",
            details: parsedEmail.error.flatten(),
          },
          { status: 400 }
        );
      }

      const result = await EnqueueEmailUseCase.execute(
        organizationId,
        parsedEmail.data,
        publishEmailJob,
        {
          apiKeyId,
          source: "publicApi",
        }
      );

      return NextResponse.json(result, {
        status: result.idempotent ? 200 : 201,
      });
    } catch (error: any) {
      if (error instanceof MessageSendValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (error instanceof MessageInsufficientCreditsError) {
        return NextResponse.json({ error: error.message }, { status: 422 });
      }

      if (error.message?.startsWith("No SMS provider configured")) {
        return NextResponse.json({ error: error.message }, { status: 422 });
      }

      console.error("[POST /v1/messages/send]", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);
