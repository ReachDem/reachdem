import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";
import { WorkspaceBillingService } from "@reachdem/core";
import { workspaceBillingSummarySchema } from "@reachdem/shared";

export const GET = withWorkspace(async ({ organizationId }) => {
  try {
    const summary = await WorkspaceBillingService.getSummary(organizationId);

    if (!summary) {
      return NextResponse.json(
        { error: "Workspace billing summary not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(workspaceBillingSummarySchema.parse(summary));
  } catch (error) {
    console.error("[GET /workspace/billing]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
