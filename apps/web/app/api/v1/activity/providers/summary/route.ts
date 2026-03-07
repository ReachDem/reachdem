import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";
import { ActivityLogger } from "@reachdem/core";
import { providerSummarySchema } from "@reachdem/shared";

export const GET = withWorkspace(async ({ req, organizationId }) => {
  try {
    const url = new URL(req.url);
    const parsed = providerSummarySchema.safeParse({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const summary = await ActivityLogger.getProviderSummary(
      organizationId,
      parsed.data.from,
      parsed.data.to
    );
    return NextResponse.json(summary);
  } catch (error: any) {
    console.error(`Error fetching provider summary:`, error);
    if (error.message === "Time window cannot exceed 30 days.") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
