import { NextRequest, NextResponse } from "next/server";
import {
  CampaignInvalidStatusError,
  CampaignNotFoundError,
  CampaignService,
} from "@reachdem/core";
import { withWorkspace } from "@reachdem/auth/guards";
import { updateCampaignSchema } from "@reachdem/shared";

// Get Campaign
export const GET = withWorkspace(async ({ req, organizationId, params }) => {
  try {
    const id = params.id as string;
    const campaign = await CampaignService.getCampaign(organizationId, id);

    if (!campaign) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error: any) {
    console.error("[Campaign API - GET :id] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
});

// Update Campaign
export const PATCH = withWorkspace(async ({ req, organizationId, params }) => {
  try {
    const id = params.id as string;
    const body = await req.json();
    const validation = updateCampaignSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation Error", details: validation.error.format() },
        { status: 400 }
      );
    }

    const campaign = await CampaignService.updateCampaign(
      organizationId,
      id,
      validation.data
    );

    return NextResponse.json(campaign);
  } catch (error: any) {
    console.error("[Campaign API - PATCH :id] Error:", error);
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

// Delete Campaign
export const DELETE = withWorkspace(async ({ req, organizationId, params }) => {
  try {
    const id = params.id as string;
    await CampaignService.deleteCampaign(organizationId, id);
    return NextResponse.json({ message: "Campaign deleted successfully" });
  } catch (error: any) {
    console.error("[Campaign API - DELETE :id] Error:", error);
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
