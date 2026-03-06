import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";
import { ActivityLogger } from "@reachdem/core";
import { listActivitySchema } from "@reachdem/shared";

export const GET = withWorkspace(async ({ req, organizationId }) => {
  try {
    const url = new URL(req.url);
    const parsed = listActivitySchema.safeParse(
      Object.fromEntries(url.searchParams)
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      category,
      severity,
      status,
      provider,
      resource_id,
      from,
      to,
      limit,
      cursor,
    } = parsed.data;

    const result = await ActivityLogger.getEvents(organizationId, {
      category,
      severity,
      status,
      provider,
      resourceId: resource_id,
      from,
      to,
      limit,
      cursor,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === "Time window cannot exceed 30 days.") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
