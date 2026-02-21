import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@reachdem/database";
import { auth } from "@reachdem/auth";
import { createContactSchema } from "@/lib/validations/contacts";
import { headers } from "next/headers";

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
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;

        const whereClause: any = {
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
            // 1. Check max 5 keys in payload
            if (Object.keys(validatedData.customFields).length > 5) {
                return NextResponse.json(
                    { error: "Maximum 5 custom fields allowed per contact" },
                    { status: 400 }
                );
            }

            // 2. Fetch definitions for this workspace
            const definitions = await prisma.contactFieldDefinition.findMany({
                where: { organizationId },
            });

            const defMap = new Map(definitions.map((def) => [def.key, def]));

            // 3. Validate each field
            for (const [key, value] of Object.entries(validatedData.customFields)) {
                const def = defMap.get(key);
                if (!def) {
                    return NextResponse.json(
                        { error: `Custom field key '${key}' is not defined for this workspace` },
                        { status: 400 }
                    );
                }

                // Validate types
                let isValid = false;
                switch (def.type) {
                    case "TEXT":
                        isValid = typeof value === "string";
                        break;
                    case "NUMBER":
                        isValid = typeof value === "number" && !isNaN(value);
                        break;
                    case "BOOLEAN":
                        isValid = typeof value === "boolean";
                        break;
                    case "URL":
                        if (typeof value === "string") {
                            try {
                                new URL(value);
                                isValid = true;
                            } catch {
                                /* invalid url */
                            }
                        }
                        break;
                    case "DATE":
                        // Check if string is a valid ISO date
                        if (typeof value === "string") {
                            const d = new Date(value);
                            isValid = !isNaN(d.getTime());
                        }
                        break;
                    case "SELECT":
                        const allowedOptions = def.options as string[] || [];
                        isValid = typeof value === "string" && allowedOptions.includes(value);
                        break;
                }

                if (!isValid) {
                    return NextResponse.json(
                        { error: `Invalid value for custom field '${key}'. Expected type: ${def.type}` },
                        { status: 400 }
                    );
                }
            }
        }

        const contact = await prisma.contact.create({
            data: {
                ...validatedData,
                organizationId,
                customFields: (validatedData.customFields as any) || null, // Prisma expects JSON to handle null
            },
        });

        return NextResponse.json({ data: contact }, { status: 201 });
    } catch (error) {
        console.error("[Contacts_POST]", error);
        if (error && (error as any).name === "ZodError") {
            return NextResponse.json({ error: (error as any).issues || (error as any).errors }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
