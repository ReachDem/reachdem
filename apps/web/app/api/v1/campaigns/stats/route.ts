import { NextResponse } from "next/server";
import { CampaignStatsService } from "@reachdem/core";
import { withWorkspace } from "@reachdem/auth/guards";

export const GET = withWorkspace(async ({ req, organizationId }) => {
  try {
    const url = new URL(req.url);
    const ids = url.searchParams
      .getAll("ids")
      .flatMap((value) => value.split(","))
      .map((value) => value.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json(
        {
          error: "Validation Error",
          details: "At least one campaign id is required.",
        },
        { status: 400 }
      );
    }

    const stats = await CampaignStatsService.getCampaignStatsBulk(
      organizationId,
      ids
    );

    return NextResponse.json({ items: stats });
  } catch (error: any) {
    console.error("[Campaign API - GET /stats] Error listing stats:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
});
