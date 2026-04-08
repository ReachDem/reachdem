import { NextResponse } from "next/server";
import { MessageService, PublicApiError } from "@reachdem/core";
import { withApiKeyAuth } from "../../../../../../lib/public-api/with-api-key-auth";

export const GET = withApiKeyAuth<{ id: string }>(
  async ({ context, params }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new PublicApiError("validation_error", "Message ID is required", 400);
    }

    try {
      const message = await MessageService.getMessageById(
        context.organizationId,
        id
      );
      return NextResponse.json(message);
    } catch (error) {
      if (error instanceof Error && error.message === "NOT_FOUND") {
        throw new PublicApiError("not_found", "Message not found", 404);
      }
      throw error;
    }
  },
  { requiredScopes: ["messages:read"] }
);
