import { NextResponse } from "next/server";
import { z } from "zod";
import { updateContactFieldSchema } from "@reachdem/shared";
import { withWorkspace } from "@reachdem/auth/guards";
import { ContactFieldService } from "@reachdem/core";

export const PATCH = withWorkspace<{ id: string }>(async ({ req, params, organizationId }) => {
    try {
        const { id } = params;
        const body = await req.json();
        const validatedData = updateContactFieldSchema.parse(body);

        const updatedField = await ContactFieldService.updateContactField(id, organizationId, validatedData);

        return NextResponse.json({ data: updatedField });
    } catch (error) {
        console.error("[ContactFields_PATCH]", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
});

export const DELETE = withWorkspace<{ id: string }>(async ({ params, organizationId }) => {
    try {
        const { id } = params;

        await ContactFieldService.deleteContactField(id, organizationId);

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[ContactFields_DELETE]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
});
