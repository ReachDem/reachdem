import { NextRequest, NextResponse } from "next/server";
import {
  CampaignInsufficientCreditsError,
  CampaignInvalidStatusError,
  CampaignLaunchValidationError,
  CampaignNotFoundError,
  CampaignStatsService,
  RequestCampaignLaunchUseCase,
} from "@reachdem/core";
import { withPublicWorkspace } from "@reachdem/auth/guards";
import { publishCampaignLaunchJob } from "@/lib/queue/publish-campaign-launch-job";

// Launch Campaign
export const POST = withPublicWorkspace(
  async ({ req, organizationId, params }) => {
    try {
      const id = params.id as string;

      await RequestCampaignLaunchUseCase.execute(
        organizationId,
        id,
        publishCampaignLaunchJob
      );
      await CampaignStatsService.invalidate(id);

      return NextResponse.json(
        { message: "Campaign launch queued successfully" },
        { status: 200 }
      );
    } catch (error: any) {
      console.error("[Campaign API - POST launch] Error:", error);

      if (error instanceof CampaignNotFoundError) {
        return NextResponse.json({ error: "Not Found" }, { status: 404 });
      }
      if (error instanceof CampaignInvalidStatusError) {
        return NextResponse.json(
          { error: "Bad Request", details: error.message },
          { status: 400 }
        );
      }
      if (
        error instanceof CampaignLaunchValidationError ||
        error instanceof CampaignInsufficientCreditsError
      ) {
        return NextResponse.json(
          { error: "Bad Request", details: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Internal Server Error", details: error.message },
        { status: 500 }
      );
    }
  }
);
