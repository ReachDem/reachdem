import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";
import {
  createTrackedLinkSchema,
  listTrackedLinksQuerySchema,
} from "@reachdem/shared";
import { TrackedLinkService } from "@reachdem/core";

export const GET = withWorkspace(async ({ req, organizationId }) => {
  try {
    const url = new URL(req.url);
    const validation = listTrackedLinksQuerySchema.safeParse({
      campaignId: url.searchParams.get("campaignId") || undefined,
      messageId: url.searchParams.get("messageId") || undefined,
      contactId: url.searchParams.get("contactId") || undefined,
      limit: url.searchParams.get("limit") || undefined,
      cursor: url.searchParams.get("cursor") || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation Error", details: validation.error.format() },
        { status: 400 }
      );
    }

    const result = await TrackedLinkService.listLinks(
      organizationId,
      validation.data
    );
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Links API - GET] Error listing links:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
});

export const POST = withWorkspace(async ({ req, organizationId }) => {
  try {
    const body = await req.json();
    const validation = createTrackedLinkSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation Error", details: validation.error.format() },
        { status: 400 }
      );
    }

    const link = await TrackedLinkService.createLink(
      organizationId,
      validation.data
    );
    return NextResponse.json(link, { status: 201 });
  } catch (error: any) {
    console.error("[Links API - POST] Error creating link:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
});
