import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";
import { SegmentService } from "@reachdem/core";
import { SegmentNodeSchema } from "@reachdem/shared";

// Evaluate a segment definition without saving it (Dry-Run Preview)
export const POST = withWorkspace(async ({ req, organizationId }) => {
  try {
    const body = await req.json();

    // Validate the definition payload
    const result = SegmentNodeSchema.safeParse(body.definition);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid segment definition", details: result.error.format() },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const cursor = url.searchParams.get("cursor");
    const q = url.searchParams.get("q") || undefined;

    const limit = limitParam
      ? Math.max(1, Math.min(parseInt(limitParam, 10) || 0, 100))
      : 50;

    const evalResult = await SegmentService.evaluateSegmentDefinition(
      organizationId,
      result.data,
      limit,
      cursor || undefined,
      q
    );

    return NextResponse.json(evalResult);
  } catch (error: any) {
    console.error("Failed to dry-run evaluate segment:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});
