import { NextRequest, NextResponse } from "next/server";
import {
  CampaignInvalidStatusError,
  CampaignNotFoundError,
  CampaignStatsService,
  LaunchCampaignUseCase,
} from "@reachdem/core";
import { withWorkspace } from "@reachdem/auth/guards";
import { publishEmailJob } from "../../../../../../lib/publish-email-job";
import { publishSmsJob } from "../../../../../../lib/publish-sms-job";

// Launch Campaign
export const POST = withWorkspace(async ({ req, organizationId, params }) => {
  try {
    const id = params.id as string;

    // Async launch process (Fire and forget from the client's perspective for large audiences)
    // Since this is MVP, we execute it directly, but for thousands of contacts,
    // this should ideally be pushed to a queue (e.g. Cloudflare Queues).
    // For now, we await it or execute it unawaited based on typical vercel timeout limits.
    // We will await it to ensure we can catch immediate validation errors (like Not Draft).

    // If we don't await, serverless might kill the function before it finishes sending SMS.
    await LaunchCampaignUseCase.execute(
      organizationId,
      id,
      publishSmsJob,
      publishEmailJob
    );
    await CampaignStatsService.invalidate(id);

    return NextResponse.json(
      { message: "Campaign launched successfully" },
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

    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
});
