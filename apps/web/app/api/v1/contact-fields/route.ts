import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@reachdem/database";
import { auth } from "@reachdem/auth";
import { z } from "zod";
import { createContactFieldSchema } from "@/lib/validations/contact-fields";
import { headers } from "next/headers";
import { MAX_CUSTOM_FIELDS_PER_ORG } from "@/lib/utils/contact-fields";

export async function GET(req: NextRequest) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = session.session?.activeOrganizationId;

    if (!organizationId) {
        return NextResponse.json({ error: "Workspace required" }, { status: 403 });
    }

    try {
        const fields = await prisma.contactFieldDefinition.findMany({
            where: { organizationId },
            orderBy: { createdAt: "asc" },
        });

        return NextResponse.json({ data: fields });
    } catch (error) {
        console.error("[ContactFields_GET]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = session.session?.activeOrganizationId;

    if (!organizationId) {
        return NextResponse.json({ error: "Workspace required" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const validatedData = createContactFieldSchema.parse(body);

        // Check limit of fields per organization
        const count = await prisma.contactFieldDefinition.count({
            where: { organizationId },
        });

        if (count >= MAX_CUSTOM_FIELDS_PER_ORG) {
            return NextResponse.json(
                { error: `Maximum number of custom fields (${MAX_CUSTOM_FIELDS_PER_ORG}) reached for this workspace` },
                { status: 400 }
            );
        }

        // Check if key already exists
        const existingKey = await prisma.contactFieldDefinition.findUnique({
            where: {
                organizationId_key: {
                    organizationId,
                    key: validatedData.key,
                },
            },
        });

        if (existingKey) {
            return NextResponse.json(
                { error: "A custom field with this key already exists" },
                { status: 400 }
            );
        }

        const field = await prisma.contactFieldDefinition.create({
            data: {
                ...validatedData,
                organizationId,
                // Prisma Json needs to handle undefined vs null properly
                options: (validatedData.options as any) || null,
            },
        });

        return NextResponse.json({ data: field }, { status: 201 });
    } catch (error) {
        console.error("[ContactFields_POST]", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
