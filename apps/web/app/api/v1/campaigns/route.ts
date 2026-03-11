import { NextRequest, NextResponse } from "next/server";
import { CampaignService } from "@reachdem/core";
import { withWorkspace } from "@reachdem/auth/guards";
import { createCampaignSchema } from "@reachdem/shared";

// List Campaigns
export const GET = withWorkspace(async ({ req, organizationId }) => {
  try {
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const cursor = url.searchParams.get("cursor");

    const limit = limitParam
      ? Math.max(1, Math.min(parseInt(limitParam, 10) || 0, 100))
      : 50;

    const result = await CampaignService.listCampaigns(organizationId, {
      limit,
      cursor: cursor || undefined,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Campaign API - GET] Error listing campaigns:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
});

// Create Campaign
export const POST = withWorkspace(async ({ req, organizationId, userId }) => {
  try {
    const body = await req.json();
    const validation = createCampaignSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation Error", details: validation.error.format() },
        { status: 400 }
      );
    }

    const campaign = await CampaignService.createCampaign(
      organizationId,
      validation.data,
      userId
    );

    return NextResponse.json(campaign, { status: 201 });
  } catch (error: any) {
    console.error("[Campaign API - POST] Error creating campaign:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
});
