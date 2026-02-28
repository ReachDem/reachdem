import { NextResponse } from "next/server";
import { z } from "zod";
import { updateContactSchema } from "@reachdem/shared";
import { withWorkspace } from "@reachdem/auth/guards";
import { ContactService } from "@reachdem/core";

export const GET = withWorkspace<{ id: string }>(async ({ params, organizationId }) => {
    try {
        const { id } = params;
        const contact = await ContactService.getContactById(id, organizationId);

        return NextResponse.json({ data: contact });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === "Contact not found") {
            return NextResponse.json({ error: "Contact not found" }, { status: 404 });
        }
        console.error("[Contacts_GET]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
});

export const PATCH = withWorkspace<{ id: string }>(async ({ req, params, organizationId }) => {
    try {
        const { id } = params;
        const body = await req.json();
        const validatedData = updateContactSchema.parse(body);

        const updatedContact = await ContactService.updateContact(id, organizationId, validatedData);

        return NextResponse.json({ data: updatedContact });
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === "Contact not found") return NextResponse.json({ error: "Contact not found" }, { status: 404 });
            if (error.message.includes("Maximum") || error.message.includes("Custom field") || error.message.includes("Invalid value") || error.message.includes("at least an email")) {
                return NextResponse.json({ error: error.message }, { status: 400 });
            }
        }
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        console.error("[Contacts_PATCH]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
});

export const DELETE = withWorkspace<{ id: string }>(async ({ params, organizationId }) => {
    try {
        const { id } = params;
        await ContactService.deleteContact(id, organizationId);

        return new NextResponse(null, { status: 204 });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === "Contact not found") {
            return NextResponse.json({ error: "Contact not found" }, { status: 404 });
        }
        console.error("[Contacts_DELETE]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
});
