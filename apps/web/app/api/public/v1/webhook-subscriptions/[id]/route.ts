import { NextResponse, type NextRequest } from "next/server";
import {
  ApiWebhookSubscriptionService,
  PublicApiError,
} from "@reachdem/core";
import { updateWebhookSubscriptionSchema } from "@reachdem/shared";
import { withApiKeyAuth } from "../../../../../../lib/public-api/with-api-key-auth";

async function parseJsonBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new PublicApiError("validation_error", "Invalid JSON body", 400);
  }
}

export const PATCH = withApiKeyAuth<{ id: string }>(
  async ({ req, context, params }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new PublicApiError(
        "validation_error",
        "Webhook subscription ID is required",
        400
      );
    }

    const parsed = updateWebhookSubscriptionSchema.safeParse(
      await parseJsonBody(req)
    );
    if (!parsed.success) {
      throw new PublicApiError("validation_error", "Invalid request body", 400, {
        issues: parsed.error.flatten(),
      });
    }

    try {
      const subscription =
        await ApiWebhookSubscriptionService.updateForApiKey(
          await import("@reachdem/database").then((mod) => mod.prisma),
          {
            organizationId: context.organizationId,
            apiKeyId: context.apiKeyId,
            subscriptionId: id,
            data: parsed.data,
          }
        );

      if (!subscription) {
        throw new PublicApiError(
          "not_found",
          "Webhook subscription not found",
          404
        );
      }

      return NextResponse.json(subscription);
    } catch (error) {
      const code =
        typeof error === "object" &&
        error &&
        "code" in error &&
        typeof (error as { code?: unknown }).code === "string"
          ? (error as { code: string }).code
          : null;

      if (code === "P2002") {
        throw new PublicApiError(
          "validation_error",
          "A webhook subscription already exists for this target URL",
          400
        );
      }
      throw error;
    }
  },
  { requiredScopes: ["webhooks:write"] }
);

export const DELETE = withApiKeyAuth<{ id: string }>(
  async ({ context, params }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new PublicApiError(
        "validation_error",
        "Webhook subscription ID is required",
        400
      );
    }

    const deleted = await ApiWebhookSubscriptionService.deleteForApiKey(
      await import("@reachdem/database").then((mod) => mod.prisma),
      {
        organizationId: context.organizationId,
        apiKeyId: context.apiKeyId,
        subscriptionId: id,
      }
    );

    if (!deleted) {
      throw new PublicApiError(
        "not_found",
        "Webhook subscription not found",
        404
      );
    }

    return new NextResponse(null, { status: 204 });
  },
  { requiredScopes: ["webhooks:write"] }
);
