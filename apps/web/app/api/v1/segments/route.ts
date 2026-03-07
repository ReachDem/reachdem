import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";
import { SegmentService } from "@reachdem/core";
import { createSegmentSchema } from "@reachdem/shared";

// List all segments
export const GET = withWorkspace(async ({ req, organizationId }) => {
  try {
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const cursor = url.searchParams.get("cursor");

    const limit = limitParam
      ? Math.max(1, Math.min(parseInt(limitParam, 10) || 0, 100))
      : 50;

    const result = await SegmentService.getSegments(organizationId, {
      limit,
      cursor: cursor || undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to list segments:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});

// Create segment
export const POST = withWorkspace(async ({ req, organizationId }) => {
  try {
    const body = await req.json();

    // Validate payload using our recursive Zod schema
    const result = createSegmentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Bad Request", details: result.error.format() },
        { status: 400 }
      );
    }

    const segment = await SegmentService.createSegment({
      organizationId,
      name: result.data.name.trim(),
      description: result.data.description,
      definition: result.data.definition,
    });

    return NextResponse.json(segment, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create segment", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});
