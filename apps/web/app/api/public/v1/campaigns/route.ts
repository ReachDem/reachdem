import { NextResponse, type NextRequest } from "next/server";
import { CampaignService, PublicApiError } from "@reachdem/core";
import { createCampaignSchema } from "@reachdem/shared";
import { withApiKeyAuth } from "../../../../../lib/public-api/with-api-key-auth";

async function parseJsonBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new PublicApiError("validation_error", "Invalid JSON body", 400);
  }
}

async function associateLinksWithCampaign(
  organizationId: string,
  campaignId: string,
  content: unknown
): Promise<void> {
  const { prisma } = await import("@reachdem/database");

  const rawContent =
    content && typeof content === "object"
      ? (content as Record<string, unknown>)
      : {};
  const textContent =
    typeof rawContent.text === "string"
      ? rawContent.text
      : typeof rawContent.html === "string"
        ? rawContent.html
        : "";

  if (!textContent) return;

  const matches = textContent.matchAll(/rcdm\.ink\/([a-zA-Z0-9]{4})/g);
  for (const match of matches) {
    const slug = match[1];
    await prisma.trackedLink.updateMany({
      where: {
        organizationId,
        slug,
        campaignId: null,
      },
      data: {
        campaignId,
      },
    });
  }
}

export const GET = withApiKeyAuth(
  async ({ req, context }) => {
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const cursor = url.searchParams.get("cursor");
    const limit = limitParam
      ? Math.max(1, Math.min(parseInt(limitParam, 10) || 0, 100))
      : 50;

    const result = await CampaignService.listCampaigns(context.organizationId, {
      limit,
      cursor: cursor || undefined,
    });

    return NextResponse.json(result);
  },
  { requiredScopes: ["campaigns:read"] }
);

export const POST = withApiKeyAuth(
  async ({ req, context }) => {
    const validation = createCampaignSchema.safeParse(await parseJsonBody(req));
    if (!validation.success) {
      throw new PublicApiError("validation_error", "Invalid request body", 400, {
        issues: validation.error.flatten(),
      });
    }

    const campaign = await CampaignService.createCampaign(
      context.organizationId,
      validation.data,
      undefined,
      { apiKeyId: context.apiKeyId }
    );

    await associateLinksWithCampaign(
      context.organizationId,
      campaign.id,
      validation.data.content
    );

    return NextResponse.json(campaign, { status: 201 });
  },
  {
    requiredScopes: ["campaigns:write"],
    idempotency: { enabled: true, required: true, ttlSeconds: 3600 },
  }
);
