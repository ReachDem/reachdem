import { NextResponse } from "next/server";
import {
  CampaignInsufficientCreditsError,
  CampaignInvalidStatusError,
  CampaignLaunchValidationError,
  CampaignNotFoundError,
  CampaignStatsService,
  RequestCampaignLaunchUseCase,
  PublicApiError,
} from "@reachdem/core";
import { withApiKeyAuth } from "../../../../../../../lib/public-api/with-api-key-auth";
import { publishCampaignLaunchJob } from "../../../../../../../lib/publish-campaign-launch-job";

export const POST = withApiKeyAuth<{ id: string }>(
  async ({ context, params }) => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      throw new PublicApiError("validation_error", "Campaign ID is required", 400);
    }

    try {
      await RequestCampaignLaunchUseCase.execute(
        context.organizationId,
        id,
        publishCampaignLaunchJob
      );
      await CampaignStatsService.invalidate(id);
      return NextResponse.json(
        { message: "Campaign launch queued successfully" },
        { status: 200 }
      );
    } catch (error) {
      if (error instanceof CampaignNotFoundError) {
        throw new PublicApiError("not_found", "Campaign not found", 404);
      }
      if (
        error instanceof CampaignInvalidStatusError ||
        error instanceof CampaignLaunchValidationError ||
        error instanceof CampaignInsufficientCreditsError
      ) {
        throw new PublicApiError("validation_error", error.message, 400);
      }
      throw error;
    }
  },
  {
    requiredScopes: ["campaigns:write"],
    idempotency: { enabled: true, required: true, ttlSeconds: 3600 },
  }
);
