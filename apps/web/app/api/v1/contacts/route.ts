import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@reachdem/database";
import { auth } from "@reachdem/auth";
import { createContactSchema } from "@/lib/validations/contacts";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { validateCustomFields, MAX_CUSTOM_FIELDS_PER_ORG } from "@/lib/utils/contact-fields";
import { z } from "zod";

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
        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q");
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
        const skip = (page - 1) * limit;

        const whereClause: Prisma.ContactWhereInput = {
            organizationId,
            deletedAt: null, // Soft delete filter
        };

        if (q) {
            whereClause.OR = [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { phoneE164: { contains: q, mode: "insensitive" } },
            ];
        }

        const contacts = await prisma.contact.findMany({
            where: whereClause,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
        });

        const total = await prisma.contact.count({ where: whereClause });

        return NextResponse.json({
            data: contacts,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("[Contacts_GET]", error);
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
        const validatedData = createContactSchema.parse(body);

        // Validate Custom Fields
        if (validatedData.customFields && Object.keys(validatedData.customFields).length > 0) {
            // 1. Check max keys in payload
            if (Object.keys(validatedData.customFields).length > MAX_CUSTOM_FIELDS_PER_ORG) {
                return NextResponse.json(
                    { error: `Maximum ${MAX_CUSTOM_FIELDS_PER_ORG} custom fields allowed per contact` },
                    { status: 400 }
                );
            }

            // 2. Fetch definitions for this workspace
            const definitions = await prisma.contactFieldDefinition.findMany({
                where: { organizationId },
            });

            // 3. Validate each field
            const validation = validateCustomFields(validatedData.customFields as Record<string, unknown>, definitions);
            if (!validation.isValid) {
                return NextResponse.json({ error: validation.error }, { status: 400 });
            }
        }

        const contact = await prisma.contact.create({
            data: {
                ...validatedData,
                organizationId,
                customFields: validatedData.customFields ? (validatedData.customFields as Prisma.InputJsonValue) : Prisma.JsonNull,
            },
        });

        return NextResponse.json({ data: contact }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        console.error("[Contacts_POST]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
