import { NextResponse, type NextRequest } from "next/server";
import {
  EnqueueSmsUseCase,
  MessageInsufficientCreditsError,
  MessageSendValidationError,
  PublicApiError,
} from "@reachdem/core";
import { sendSmsSchema } from "@reachdem/shared";
import { withApiKeyAuth } from "../../../../../../lib/public-api/with-api-key-auth";
import { publishSmsJob } from "../../../../../../lib/publish-sms-job";

const publicSendSmsSchema = sendSmsSchema.omit({ idempotency_key: true });

async function parseJsonBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new PublicApiError("validation_error", "Invalid JSON body", 400);
  }
}

export const POST = withApiKeyAuth(
  async ({ req, context }) => {
    try {
      const parsed = publicSendSmsSchema.safeParse(await parseJsonBody(req));
      if (!parsed.success) {
        throw new PublicApiError("validation_error", "Invalid request body", 400, {
          issues: parsed.error.flatten(),
        });
      }

      const idempotencyKey = req.headers.get("idempotency-key");
      if (!idempotencyKey) {
        throw new PublicApiError(
          "missing_idempotency_key",
          "Idempotency-Key header is required",
          400
        );
      }

      const result = await EnqueueSmsUseCase.execute(
        context.organizationId,
        {
          ...parsed.data,
          idempotency_key: idempotencyKey,
        },
        publishSmsJob,
        {
          apiKeyId: context.apiKeyId,
          source: "publicApi",
        }
      );

      return NextResponse.json(result, {
        status: result.idempotent ? 200 : 201,
      });
    } catch (error) {
      if (
        error instanceof MessageSendValidationError ||
        error instanceof MessageInsufficientCreditsError
      ) {
        throw new PublicApiError("validation_error", error.message, 400);
      }
      if (
        error instanceof Error &&
        error.message.startsWith("No SMS provider configured")
      ) {
        throw new PublicApiError("validation_error", error.message, 422);
      }
      throw error;
    }
  },
  {
    requiredScopes: ["messages:write"],
    idempotency: { enabled: true, required: true, ttlSeconds: 3600 },
  }
);
