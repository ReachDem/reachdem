import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";
import { ActivityLogger } from "@reachdem/core";

export const GET = withWorkspace(async ({ organizationId, params }) => {
  try {
    const { id } = params as { id: string };
    const event = await ActivityLogger.getEventById(organizationId, id);
    return NextResponse.json(event);
  } catch (error: any) {
    console.error(`Error fetching activity event by ID:`, error);
    if (error.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Activity event not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
