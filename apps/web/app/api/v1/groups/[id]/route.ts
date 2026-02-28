import { NextResponse } from "next/server";
import { groupSchema } from "@reachdem/shared";
import { z } from "zod";
import { withWorkspace } from "@reachdem/auth/guards";
import { GroupService } from "@reachdem/core";

export const GET = withWorkspace<{ id: string }>(async ({ params, organizationId }) => {
    try {
        const { id } = params;
        const group = await GroupService.getGroupById(id, organizationId);

        return NextResponse.json({ data: group }, { status: 200 });
    } catch (error: unknown) {
        if (error instanceof Error && (error.message === "Group not found" || error.message.includes("Unauthorized to access"))) {
            return NextResponse.json({ error: "Group not found" }, { status: 404 });
        }
        console.error("Failed to fetch group:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
});

export const PATCH = withWorkspace<{ id: string }>(async ({ req, params, organizationId }) => {
    try {
        const { id } = params;
        const body = await req.json();

        // Ensure at least one field is provided for update
        const partialSchema = groupSchema.partial();
        const validatedData = partialSchema.parse(body);

        if (Object.keys(validatedData).length === 0) {
            return NextResponse.json(
                { error: "At least one field (name or description) is required to update" },
                { status: 400 }
            );
        }

        const updatedGroup = await GroupService.updateGroup(id, organizationId, validatedData);

        return NextResponse.json({ data: updatedGroup }, { status: 200 });
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === "Group not found" || error.message.includes("Unauthorized to access")) {
                return NextResponse.json({ error: "Group not found" }, { status: 404 });
            }
            if (error.message.includes("already exists")) {
                return NextResponse.json(
                    { error: "Another group with this name already exists in your workspace." },
                    { status: 409 }
                );
            }
        }
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }

        console.error("Failed to update group:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
});

export const DELETE = withWorkspace<{ id: string }>(async ({ params, organizationId }) => {
    try {
        const { id } = params;

        await GroupService.deleteGroup(id, organizationId);

        return new NextResponse(null, { status: 204 });
    } catch (error: unknown) {
        if (error instanceof Error && (error.message === "Group not found" || error.message.includes("Unauthorized to access"))) {
            return NextResponse.json({ error: "Group not found" }, { status: 404 });
        }
        console.error("Failed to delete group:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
});
