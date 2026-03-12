import { NextRequest, NextResponse } from "next/server";
import {
  CampaignAudienceValidationError,
  CampaignInvalidStatusError,
  CampaignNotFoundError,
  CampaignService,
} from "@reachdem/core";
import { withWorkspace } from "@reachdem/auth/guards";
import { setCampaignAudienceSchema } from "@reachdem/shared";

// Get Audiences
export const GET = withWorkspace(async ({ req, organizationId, params }) => {
  try {
    const id = params.id as string;
    const audiences = await CampaignService.getAudiences(organizationId, id);
    return NextResponse.json(audiences);
  } catch (error: any) {
    console.error("[Campaign Audience API - GET] Error:", error);
    if (error instanceof CampaignNotFoundError) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
});

// Set Audiences
export const POST = withWorkspace(async ({ req, organizationId, params }) => {
  try {
    const id = params.id as string;
    const body = await req.json();
    const validation = setCampaignAudienceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation Error", details: validation.error.format() },
        { status: 400 }
      );
    }

    const audiences = await CampaignService.setAudiences(
      organizationId,
      id,
      validation.data
    );

    return NextResponse.json(audiences, { status: 201 });
  } catch (error: any) {
    console.error("[Campaign Audience API - POST] Error:", error);
    if (error instanceof CampaignNotFoundError) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    if (
      error instanceof CampaignInvalidStatusError ||
      error instanceof CampaignAudienceValidationError
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
});
