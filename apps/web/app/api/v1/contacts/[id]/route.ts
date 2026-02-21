import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@reachdem/database";
import { auth } from "@reachdem/auth";
import { updateContactSchema } from "@/lib/validations/contacts";
import { headers } from "next/headers";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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
        const { id } = await params;
        const contact = await prisma.contact.findUnique({
            where: { id },
        });

        if (!contact || contact.organizationId !== organizationId || contact.deletedAt) {
            return NextResponse.json({ error: "Contact not found" }, { status: 404 });
        }

        return NextResponse.json({ data: contact });
    } catch (error) {
        console.error("[Contacts_GET_SINGLE]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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
        const { id } = await params;
        const body = await req.json();
        const validatedData = updateContactSchema.parse(body);

        const existingContact = await prisma.contact.findUnique({
            where: { id },
        });

        if (!existingContact || existingContact.organizationId !== organizationId || existingContact.deletedAt) {
            return NextResponse.json({ error: "Contact not found" }, { status: 404 });
        }

        // Logic-side validation: ensure the update does not leave the contact without both a phone and an email
        // undefined means it wasn't provided in the payload (so it stays the same)
        const resultingPhone = validatedData.phoneE164 !== undefined ? validatedData.phoneE164 : existingContact.phoneE164;
        const resultingEmail = validatedData.email !== undefined ? validatedData.email : existingContact.email;

        const hasResultingPhone = resultingPhone && resultingPhone.length > 0;
        const hasResultingEmail = resultingEmail && resultingEmail.length > 0;

        if (!hasResultingPhone && !hasResultingEmail) {
            return NextResponse.json(
                { error: [{ message: "A contact must have at least an email or a phone number. You cannot remove both." }] },
                { status: 400 }
            );
        }

        // Validate custom fields if updated
        if (validatedData.customFields !== undefined && validatedData.customFields !== null) {
            if (Object.keys(validatedData.customFields).length > 5) {
                return NextResponse.json(
                    { error: "Maximum 5 custom fields allowed per contact" },
                    { status: 400 }
                );
            }

            const definitions = await prisma.contactFieldDefinition.findMany({
                where: { organizationId },
            });
            const defMap = new Map(definitions.map((def) => [def.key, def]));

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
                        isValid = typeof value === "string"; break;
                    case "NUMBER":
                        isValid = typeof value === "number" && !isNaN(value); break;
                    case "BOOLEAN":
                        isValid = typeof value === "boolean"; break;
                    case "URL":
                        if (typeof value === "string") {
                            try { new URL(value); isValid = true; } catch { }
                        } break;
                    case "DATE":
                        if (typeof value === "string") {
                            isValid = !isNaN(new Date(value).getTime());
                        } break;
                    case "SELECT":
                        const allowedOptions = def.options as string[] || [];
                        isValid = typeof value === "string" && allowedOptions.includes(value); break;
                }

                if (!isValid) {
                    return NextResponse.json(
                        { error: `Invalid value for custom field '${key}'. Expected type: ${def.type}` },
                        { status: 400 }
                    );
                }
            }
        }

        const updatedContact = await prisma.contact.update({
            where: { id },
            data: {
                ...validatedData,
                customFields: validatedData.customFields === undefined ? undefined : ((validatedData.customFields as any) || null),
            },
        });

        return NextResponse.json({ data: updatedContact });
    } catch (error) {
        console.error("[Contacts_PATCH]", error);
        if (error && (error as any).name === "ZodError") {
            return NextResponse.json({ error: (error as any).issues || (error as any).errors }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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
        const { id } = await params;
        const existingContact = await prisma.contact.findUnique({
            where: { id },
        });

        if (!existingContact || existingContact.organizationId !== organizationId || existingContact.deletedAt) {
            return NextResponse.json({ error: "Contact not found" }, { status: 404 });
        }

        // Soft delete
        await prisma.contact.update({
            where: { id },
            data: { deletedAt: new Date() }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[Contacts_DELETE]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
