import { NextResponse, type NextRequest } from "next/server";
import {
  EnqueueEmailUseCase,
  MessageInsufficientCreditsError,
  PublicApiError,
} from "@reachdem/core";
import { sendEmailSchema } from "@reachdem/shared";
import { withApiKeyAuth } from "../../../../../../lib/public-api/with-api-key-auth";
import { publishEmailJob } from "../../../../../../lib/publish-email-job";

const publicSendEmailSchema = sendEmailSchema.omit({ idempotency_key: true });

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
      const parsed = publicSendEmailSchema.safeParse(await parseJsonBody(req));
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

      const result = await EnqueueEmailUseCase.execute(
        context.organizationId,
        {
          ...parsed.data,
          idempotency_key: idempotencyKey,
        },
        publishEmailJob,
        {
          apiKeyId: context.apiKeyId,
          source: "publicApi",
        }
      );

      return NextResponse.json(result, {
        status: result.idempotent ? 200 : 201,
      });
    } catch (error) {
      if (error instanceof MessageInsufficientCreditsError) {
        throw new PublicApiError("validation_error", error.message, 400);
      }
      throw error;
    }
  },
  {
    requiredScopes: ["messages:write"],
    idempotency: { enabled: true, required: true, ttlSeconds: 3600 },
  }
);
