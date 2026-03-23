import { NextResponse } from "next/server";
import { CampaignNotFoundError, CampaignStatsService } from "@reachdem/core";
import { withWorkspace } from "@reachdem/auth/guards";

export const GET = withWorkspace(async ({ organizationId, params }) => {
  try {
    const id = params.id as string;
    const stats = await CampaignStatsService.getCampaignStats(
      organizationId,
      id
    );
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error("[Campaign API - GET :id/stats] Error:", error);
    if (error instanceof CampaignNotFoundError) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
});
