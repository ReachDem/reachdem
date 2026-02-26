import { NextResponse } from "next/server";
import { prisma } from "@reachdem/database";
import { groupSchema } from "@/lib/validations/groups";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { withWorkspace } from "@/lib/utils/workspace";

export const GET = withWorkspace(async ({ req, organizationId }) => {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const cursor = searchParams.get("cursor");

    try {
        const queryOptions: Prisma.GroupFindManyArgs = {
            where: { organizationId },
            take: limit,
            orderBy: { createdAt: "desc" },
        };

        if (cursor) {
            queryOptions.cursor = { id: cursor };
            queryOptions.skip = 1; // Skip the cursor itself
        }

        const [groups, total] = await Promise.all([
            prisma.group.findMany(queryOptions),
            prisma.group.count({ where: { organizationId } }),
        ]);

        const nextCursor = groups.length === limit ? groups[groups.length - 1].id : null;

        return NextResponse.json(
            {
                data: groups,
                meta: {
                    total,
                    limit,
                    nextCursor,
                },
            },
            { status: 200 }
        );
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

        // Enforce case-insensitive unique naming within the same organization
        const existingGroup = await prisma.group.findFirst({
            where: {
                organizationId,
                name: {
                    equals: validatedData.name,
                    mode: "insensitive"
                }
            }
        });

        if (existingGroup) {
            return NextResponse.json({ error: "A group with this name already exists in your workspace." }, { status: 409 });
        }

        const group = await prisma.group.create({
            data: {
                ...validatedData,
                organizationId,
            }
        });

        return NextResponse.json({ data: group }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }

        console.error("Failed to create group:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
});
