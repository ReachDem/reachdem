import { NextResponse } from "next/server";
import { prisma } from "@reachdem/database";
import { groupSchema } from "@/lib/validations/groups";
import { z } from "zod";
import { withWorkspace } from "@/lib/utils/workspace";

export const GET = withWorkspace<{ id: string }>(async ({ params, organizationId }) => {
    try {
        const { id } = params;

        const group = await prisma.group.findUnique({
            where: {
                id,
                organizationId, // Security check
            },
        });

        if (!group) {
            return NextResponse.json({ error: "Group not found" }, { status: 404 });
        }

        return NextResponse.json({ data: group }, { status: 200 });
    } catch (error) {
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

        // Verify group exists and belongs to the workspace
        const existingGroup = await prisma.group.findUnique({
            where: { id, organizationId },
        });

        if (!existingGroup) {
            return NextResponse.json({ error: "Group not found" }, { status: 404 });
        }

        // If trying to rename, check for uniqueness constraint collisions
        if (validatedData.name && validatedData.name.toLowerCase() !== existingGroup.name.toLowerCase()) {
            const collisionGroup = await prisma.group.findFirst({
                where: {
                    organizationId,
                    name: {
                        equals: validatedData.name,
                        mode: "insensitive",
                    },
                },
            });

            if (collisionGroup) {
                return NextResponse.json(
                    { error: "Another group with this name already exists in your workspace." },
                    { status: 409 }
                );
            }
        }

        const updatedGroup = await prisma.group.update({
            where: { id },
            data: validatedData,
        });

        return NextResponse.json({ data: updatedGroup }, { status: 200 });
    } catch (error) {
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

        // Verify group exists and belongs to workspace
        const existingGroup = await prisma.group.findUnique({
            where: { id, organizationId },
        });

        if (!existingGroup) {
            return NextResponse.json({ error: "Group not found" }, { status: 404 });
        }

        // The PostgreSQL Cascade rules will automatically delete any GroupMember rows attached
        await prisma.group.delete({
            where: { id },
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("Failed to delete group:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
});
