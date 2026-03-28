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

    // Associate existing tracked links with this campaign
    await associateLinksWithCampaign(
      organizationId,
      campaign.id,
      validation.data.content
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

// Helper function to associate existing rcdm.ink links with campaign
async function associateLinksWithCampaign(
  organizationId: string,
  campaignId: string,
  content: any
): Promise<void> {
  const { prisma } = await import("@reachdem/database");

  // Extract text content
  let textContent = "";
  if (content?.text) {
    textContent = content.text;
  } else if (content?.html) {
    textContent = content.html;
  }

  if (!textContent) return;

  // Find all rcdm.ink links (already shortened)
  const rcdmLinkRegex = /rcdm\.ink\/([a-zA-Z0-9]{4})/g;
  const matches = textContent.matchAll(rcdmLinkRegex);

  for (const match of matches) {
    const slug = match[1];
    try {
      // Update the tracked link to associate it with this campaign
      await prisma.trackedLink.updateMany({
        where: {
          organizationId,
          slug,
          campaignId: null, // Only update if not already associated
        },
        data: {
          campaignId,
        },
      });
      console.log(
        `[associateLinksWithCampaign] Associated link ${slug} with campaign ${campaignId}`
      );
    } catch (error) {
      console.error(
        `[associateLinksWithCampaign] Failed to associate link ${slug}:`,
        error
      );
    }
  }
}
