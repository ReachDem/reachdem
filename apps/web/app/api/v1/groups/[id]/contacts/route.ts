import { NextResponse } from "next/server";
import { GroupMemberService } from "@reachdem/core";
import { withWorkspace } from "@reachdem/auth/guards";
import { bulkGroupMembersSchema } from "@reachdem/shared";
import { z } from "zod";

export const GET = withWorkspace<{ id: string }>(async ({ req, params, organizationId }) => {
    try {
        const { id: groupId } = params;
        const { searchParams } = new URL(req.url);
        const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
        const cursor = searchParams.get("cursor");

        const result = await GroupMemberService.getGroupContacts(groupId, organizationId, { limit, cursor });

        return NextResponse.json(result, { status: 200 });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === "Group not found") {
            return NextResponse.json({ error: "Group not found" }, { status: 404 });
        }
        console.error("Failed to fetch group contacts:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
});



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

        try {
            const totalInserted = await GroupMemberService.addGroupMembers(groupId, organizationId, requestedContactIds);

            return NextResponse.json(
                { message: `Successfully added ${totalInserted} new members.` },
                { status: 201 }
            );
        } catch (error: unknown) {
            if (error instanceof Error) {
                if (error.name === "NotFoundError" || error.message.includes("No Group found")) {
                    return NextResponse.json({ error: "Group not found" }, { status: 404 });
                }
                if (error.message.includes("do not belong to this workspace")) {
                    return NextResponse.json({ error: error.message }, { status: 400 });
                }
            }
            throw error;
        }
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

        try {
            const totalDeleted = await GroupMemberService.removeGroupMembers(groupId, organizationId, requestedContactIds);

            return NextResponse.json(
                { message: `Successfully removed ${totalDeleted} members.` },
                { status: 200 }
            );
        } catch (error: unknown) {
            if (error instanceof Error && error.message === "Group not found") {
                return NextResponse.json({ error: "Group not found" }, { status: 404 });
            }
            throw error;
        }
    } catch (error) {
        console.error("Failed to remove members from group:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
});
