import { NextResponse } from "next/server";
import { z } from "zod";
import { createContactFieldSchema } from "@reachdem/shared";
import { withWorkspace } from "@reachdem/auth/guards";
import { ContactFieldService, ContactFieldError } from "@reachdem/core";

const CONTACT_FIELD_ERROR_STATUS: Record<
  ContactFieldError["code"],
  { status: number; message: string }
> = {
  DUPLICATE_KEY: {
    status: 409,
    message: "A custom field with this key already exists.",
  },
  QUOTA_EXCEEDED: {
    status: 422,
    message: "Maximum number of custom fields reached for this workspace.",
  },
  NOT_FOUND: { status: 404, message: "Field not found." },
};

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
    if (error instanceof ContactFieldError) {
      const { status, message } = CONTACT_FIELD_ERROR_STATUS[error.code];
      return NextResponse.json({ error: message }, { status });
    }
    console.error("[ContactFields_POST]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});
