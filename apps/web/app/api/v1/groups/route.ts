import { NextResponse } from "next/server";
import { groupSchema } from "@reachdem/shared";
import { z } from "zod";
import { withWorkspace } from "@reachdem/auth/guards";
import { GroupService } from "@reachdem/core";

export const GET = withWorkspace(async ({ req, organizationId }) => {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const cursor = searchParams.get("cursor");

    try {
        const result = await GroupService.getGroups(organizationId, { limit, cursor });
        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        console.error("Failed to fetch groups:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
});

export const POST = withWorkspace(async ({ req, organizationId }) => {
    try {
        const body = await req.json();
        const validatedData = groupSchema.parse(body);

        const group = await GroupService.createGroup(organizationId, validatedData);
        return NextResponse.json({ data: group }, { status: 201 });
    } catch (error: unknown) {
        if (error instanceof Error && error.message.includes("already exists")) {
            return NextResponse.json({ error: error.message }, { status: 409 });
        }
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }

        console.error("Failed to create group:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
});
