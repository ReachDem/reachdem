import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";
import { SegmentService } from "@reachdem/core";
import { updateSegmentSchema } from "@reachdem/shared";

export const GET = withWorkspace(async ({ organizationId, params }) => {
  try {
    const { id } = params as { id: string };
    const segment = await SegmentService.getSegmentById(organizationId, id);
    return NextResponse.json(segment);
  } catch (error: any) {
    if (error.message === "Segment not found") {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }
    console.error("Failed to fetch segment:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});

export const PATCH = withWorkspace(async ({ req, organizationId, params }) => {
  try {
    const { id } = params as { id: string };
    const body = await req.json();

    const result = updateSegmentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Bad Request", details: result.error.format() },
        { status: 400 }
      );
    }

    const segment = await SegmentService.updateSegment({
      organizationId,
      segmentId: id,
      ...result.data,
    });

    return NextResponse.json(segment);
  } catch (error: any) {
    if (error.message === "Segment not found") {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }
    console.error("Failed to update segment:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});

export const DELETE = withWorkspace(async ({ organizationId, params }) => {
  try {
    const { id } = params as { id: string };
    await SegmentService.deleteSegment(organizationId, id);
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    if (error.message === "Segment not found") {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }
    console.error("Failed to delete segment:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});
