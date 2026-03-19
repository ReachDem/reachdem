import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";
import { updateTrackedLinkSchema } from "@reachdem/shared";
import { TrackedLinkNotFoundError, TrackedLinkService } from "@reachdem/core";

export const GET = withWorkspace(async ({ organizationId, params }) => {
  try {
    const id = params.id as string;
    const link = await TrackedLinkService.getLinkById(organizationId, id);
    return NextResponse.json(link);
  } catch (error: any) {
    console.error("[Links API - GET :id] Error:", error);
    if (error instanceof TrackedLinkNotFoundError) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
});

export const PATCH = withWorkspace(async ({ req, organizationId, params }) => {
  try {
    const id = params.id as string;
    const body = await req.json();
    const validation = updateTrackedLinkSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation Error", details: validation.error.format() },
        { status: 400 }
      );
    }

    const link = await TrackedLinkService.updateLink(
      organizationId,
      id,
      validation.data
    );
    return NextResponse.json(link);
  } catch (error: any) {
    console.error("[Links API - PATCH :id] Error:", error);
    if (error instanceof TrackedLinkNotFoundError) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
});
