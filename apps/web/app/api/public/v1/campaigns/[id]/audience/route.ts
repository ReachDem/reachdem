import { NextResponse } from "next/server";
import {
  CampaignAudienceValidationError,
  CampaignInvalidStatusError,
  CampaignNotFoundError,
  CampaignService,
  PublicApiError,
} from "@reachdem/core";
import { setCampaignAudienceSchema } from "@reachdem/shared";
import { withApiKeyAuth } from "../../../../../../../lib/public-api/with-api-key-auth";

export const GET = withApiKeyAuth<{ id: string }>(
  async ({ context, params }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new PublicApiError("validation_error", "Campaign ID is required", 400);
    }

    try {
      const audiences = await CampaignService.getAudiences(context.organizationId, id);
      return NextResponse.json(audiences);
    } catch (error) {
      if (error instanceof CampaignNotFoundError) {
        throw new PublicApiError("not_found", "Campaign not found", 404);
      }
      throw error;
    }
  },
  { requiredScopes: ["campaigns:read"] }
);

export const POST = withApiKeyAuth<{ id: string }>(
  async ({ req, context, params }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new PublicApiError("validation_error", "Campaign ID is required", 400);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new PublicApiError("validation_error", "Invalid JSON body", 400);
    }

    const validation = setCampaignAudienceSchema.safeParse(body);
    if (!validation.success) {
      throw new PublicApiError("validation_error", "Invalid request body", 400, {
        issues: validation.error.flatten(),
      });
    }

    try {
      const audiences = await CampaignService.setAudiences(
        context.organizationId,
        id,
        validation.data
      );
      return NextResponse.json(audiences, { status: 201 });
    } catch (error) {
      if (error instanceof CampaignNotFoundError) {
        throw new PublicApiError("not_found", "Campaign not found", 404);
      }
      if (
        error instanceof CampaignInvalidStatusError ||
        error instanceof CampaignAudienceValidationError
      ) {
        throw new PublicApiError("validation_error", error.message, 400);
      }
      throw error;
    }
  },
  { requiredScopes: ["campaigns:write"] }
);
