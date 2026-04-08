import { NextResponse } from "next/server";
import { MessageService, PublicApiError } from "@reachdem/core";
import { listMessagesSchema } from "@reachdem/shared";
import { withApiKeyAuth } from "../../../../../lib/public-api/with-api-key-auth";

export const GET = withApiKeyAuth(
  async ({ req, context }) => {
    const url = new URL(req.url);
    const parsed = listMessagesSchema.safeParse(
      Object.fromEntries(url.searchParams)
    );

    if (!parsed.success) {
      throw new PublicApiError("validation_error", "Invalid query parameters", 400, {
        issues: parsed.error.flatten(),
      });
    }

    const result = await MessageService.listMessages(
      context.organizationId,
      parsed.data
    );

    return NextResponse.json(result);
  },
  { requiredScopes: ["messages:read"] }
);
