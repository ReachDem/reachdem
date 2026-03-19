import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";
import { TrackedLinkNotFoundError, TrackedLinkService } from "@reachdem/core";

export const GET = withWorkspace(async ({ organizationId, params }) => {
  try {
    const id = params.id as string;
    const stats = await TrackedLinkService.refreshLinkStats(organizationId, id);
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error("[Links API - GET :id/stats] Error:", error);
    if (error instanceof TrackedLinkNotFoundError) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
});
