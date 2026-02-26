import { NextResponse } from "next/server";
import { prisma } from "@reachdem/database";
import { withWorkspace } from "@/lib/utils/workspace";
import { bulkGroupMembersSchema } from "@/lib/validations/groups";
import { z } from "zod";

export const GET = withWorkspace<{ id: string }>(async ({ req, params, organizationId }) => {
    try {
        const { id: groupId } = params;
        const { searchParams } = new URL(req.url);
        const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
        const cursor = searchParams.get("cursor");

        // 1. Ensure group exists and belongs to the workspace
        const existingGroup = await prisma.group.findUnique({
            where: { id: groupId, organizationId },
        });

        if (!existingGroup) {
            return NextResponse.json({ error: "Group not found" }, { status: 404 });
        }

        const [memberships, total] = await Promise.all([
            prisma.groupMember.findMany({
                where: { groupId },
                take: limit,
                orderBy: { addedAt: "desc" }, // Most recently added first
                include: {
                    contact: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phoneE164: true,
                            createdAt: true,
                        },
                    },
                },
                cursor: cursor ? {
                    groupId_contactId: {
                        groupId,
                        contactId: cursor,
                    }
                } : undefined,
                skip: cursor ? 1 : undefined,
            }),
            prisma.groupMember.count({ where: { groupId } }),
        ]);

        // 3. Format response as a Safe DTO payload
        const items = memberships.map(m => m.contact);
        const nextCursor =
            memberships.length === limit ? memberships[memberships.length - 1].contactId : null;

        return NextResponse.json(
            {
                group_id: groupId,
                items,
                meta: {
                    total,
                    limit,
                    nextCursor,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Failed to fetch group contacts:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
});

// Helper for chunking large arrays
function chunkArray<T>(array: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(array.length / size) }, (v, i) =>
        array.slice(i * size, i * size + size)
    );
}

export const POST = withWorkspace<{ id: string }>(async ({ req, params, organizationId }) => {
    try {
        const { id: groupId } = params;
        const body = await req.json();

        // 1. Zod Validation (ensures length <= 500)
        let validatedData;
        try {
            validatedData = bulkGroupMembersSchema.parse(body);
        } catch (e: unknown) {
            if (e instanceof z.ZodError) {
                return NextResponse.json({ error: e.issues }, { status: 400 });
            }
            if (e instanceof Error) {
                return NextResponse.json({ error: e.message }, { status: 400 });
            }
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        const requestedContactIds = [...new Set(validatedData.contact_ids)]; // Remove any internal duplicates from array

        return await prisma.$transaction(async (tx) => {
            // 2. Ensure group belongs to workspace
            const existingGroup = await tx.group.findUnique({
                where: { id: groupId, organizationId },
            });

            if (!existingGroup) {
                return NextResponse.json({ error: "Group not found" }, { status: 404 });
            }

            // 3. Security: Ensure ALL requested contacts exist and belong to the same workspace
            // We chunk the counting to avoid SQL query string limits on massive 'IN (...)' clauses
            const contactChunks = chunkArray(requestedContactIds, 500);
            let validContactsCount = 0;

            for (const chunk of contactChunks) {
                const count = await tx.contact.count({
                    where: {
                        id: { in: chunk },
                        organizationId,
                    },
                });
                validContactsCount += count;
            }

            if (validContactsCount !== requestedContactIds.length) {
                return NextResponse.json(
                    { error: "One or more contacts are invalid or do not belong to this workspace." },
                    { status: 400 }
                );
            }

            // 4. Insert members gracefully (skip duplicates to ensure idempotence)
            let totalInserted = 0;
            const insertData = requestedContactIds.map((contactId: string) => ({
                groupId,
                contactId,
            }));
            const insertChunks = chunkArray(insertData, 500);

            for (const chunk of insertChunks) {
                const result = await tx.groupMember.createMany({
                    data: chunk,
                    skipDuplicates: true, // Prevents errors if contact is already in the group                 
                });
                totalInserted += result.count;
            }

            return NextResponse.json(
                { message: `Successfully added ${totalInserted} new members.` },
                { status: 201 }
            );
        });
    } catch (error) {
        console.error("Failed to add members to group:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
});

export const DELETE = withWorkspace<{ id: string }>(async ({ req, params, organizationId }) => {
    try {
        const { id: groupId } = params;
        const body = await req.json();

        // Standard validation
        let validatedData;
        try {
            validatedData = bulkGroupMembersSchema.parse(body);
        } catch (e: unknown) {
            if (e instanceof z.ZodError) {
                return NextResponse.json({ error: e.issues }, { status: 400 });
            }
            if (e instanceof Error) {
                return NextResponse.json({ error: e.message }, { status: 400 });
            }
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        const requestedContactIds = validatedData.contact_ids;

        // Ensure group belongs to workspace
        const existingGroup = await prisma.group.findUnique({
            where: { id: groupId, organizationId },
        });

        if (!existingGroup) {
            return NextResponse.json({ error: "Group not found" }, { status: 404 });
        }

        // Delete requested members in chunks to avoid parameter limits
        const contactChunks = chunkArray(requestedContactIds, 500);
        let totalDeleted = 0;

        for (const chunk of contactChunks) {
            const result = await prisma.groupMember.deleteMany({
                where: {
                    groupId,
                    contactId: { in: chunk },
                },
            });
            totalDeleted += result.count;
        }

        // 204 No Content is ideal, but Next.js NextResponse needs a body for 200 message
        return NextResponse.json(
            { message: `Successfully removed ${totalDeleted} members.` },
            { status: 200 }
        );
    } catch (error) {
        console.error("Failed to remove members from group:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
});
