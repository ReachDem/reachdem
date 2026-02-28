import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";
import { ContactService } from "@reachdem/core";

export const GET = withWorkspace(async ({ req, organizationId, params }) => {
    try {
        const { id } = params as { id: string };
        const url = new URL(req.url);
        const limitParam = url.searchParams.get("limit");
        const cursor = url.searchParams.get("cursor");
        const q = url.searchParams.get("q") || undefined;

        const limit = limitParam ? parseInt(limitParam, 10) : 50;

        const result = await ContactService.getContactsBySegment(
            organizationId,
            id,
            limit,
            cursor || undefined,
            q
        );

        return NextResponse.json({
            segmentId: id,
            ...result
        });
    } catch (error: any) {
        if (error.message === "Segment not found") {
            return NextResponse.json({ error: "Segment not found" }, { status: 404 });
        }
        console.error("Failed to evaluate segment contacts:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
});
