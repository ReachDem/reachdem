import { NextResponse } from "next/server";
import { z } from "zod";
import { createContactFieldSchema } from "@reachdem/shared";
import { withWorkspace } from "@reachdem/auth/guards";
import { ContactFieldService } from "@reachdem/core";

export const GET = withWorkspace(async ({ organizationId }) => {
  try {
    const fields = await ContactFieldService.getContactFields(organizationId);
    return NextResponse.json({ data: fields });
  } catch (error) {
    console.error("[ContactFields_GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});

export const POST = withWorkspace(async ({ req, organizationId }) => {
  try {
    const body = await req.json();
    const validatedData = createContactFieldSchema.parse(body);

    const field = await ContactFieldService.createContactField(organizationId, {
      ...validatedData,
    });

    return NextResponse.json({ data: field }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[ContactFields_POST]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});
