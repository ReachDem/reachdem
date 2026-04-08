import { NextResponse, type NextRequest } from "next/server";
import {
  ApiWebhookSubscriptionService,
  PublicApiError,
} from "@reachdem/core";
import {
  createWebhookSubscriptionSchema,
} from "@reachdem/shared";
import { withApiKeyAuth } from "../../../../../lib/public-api/with-api-key-auth";

async function parseJsonBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new PublicApiError("validation_error", "Invalid JSON body", 400);
  }
}

export const GET = withApiKeyAuth(
  async ({ context }) => {
    const subscriptions = await ApiWebhookSubscriptionService.listForApiKey(
      await import("@reachdem/database").then((mod) => mod.prisma),
      {
        organizationId: context.organizationId,
        apiKeyId: context.apiKeyId,
      }
    );

    return NextResponse.json({ items: subscriptions });
  },
  { requiredScopes: ["webhooks:read"] }
);

export const POST = withApiKeyAuth(
  async ({ req, context }) => {
    const parsed = createWebhookSubscriptionSchema.safeParse(
      await parseJsonBody(req)
    );
    if (!parsed.success) {
      throw new PublicApiError("validation_error", "Invalid request body", 400, {
        issues: parsed.error.flatten(),
      });
    }

    try {
      const subscription =
        await ApiWebhookSubscriptionService.createForApiKey(
          await import("@reachdem/database").then((mod) => mod.prisma),
          {
            organizationId: context.organizationId,
            apiKeyId: context.apiKeyId,
            data: parsed.data,
          }
        );

      return NextResponse.json(subscription, { status: 201 });
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
