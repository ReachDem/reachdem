import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@reachdem/database";
import { auth } from "@reachdem/auth";
import { z } from "zod";
import { updateContactFieldSchema } from "@/lib/validations/contact-fields";
import { headers } from "next/headers";

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
        const validatedData = updateContactFieldSchema.parse(body);

        const existingField = await prisma.contactFieldDefinition.findUnique({
            where: { id },
        });

        if (!existingField || existingField.organizationId !== organizationId) {
            return NextResponse.json({ error: "Field not found" }, { status: 404 });
        }

        const updatedField = await prisma.contactFieldDefinition.update({
            where: { id },
            data: {
                ...validatedData,
                options: validatedData.options === undefined ? undefined : ((validatedData.options as any) || null),
            },
        });

        return NextResponse.json({ data: updatedField });
    } catch (error) {
        console.error("[ContactFields_PATCH]", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: (error as any).errors }, { status: 400 });
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
        const existingField = await prisma.contactFieldDefinition.findUnique({
            where: { id },
        });

        if (!existingField || existingField.organizationId !== organizationId) {
            return NextResponse.json({ error: "Field not found" }, { status: 404 });
        }

        await prisma.contactFieldDefinition.delete({
            where: { id },
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[ContactFields_DELETE]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
