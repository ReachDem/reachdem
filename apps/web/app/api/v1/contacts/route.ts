import { NextResponse } from "next/server";
import { z } from "zod";
import { createContactSchema } from "@reachdem/shared";
import { withPublicWorkspace } from "@reachdem/auth/guards";
import { ContactService } from "@reachdem/core";

export const GET = withPublicWorkspace(async ({ req, organizationId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const result = await ContactService.getContacts(organizationId, {
      q,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Contacts_GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});

export const POST = withPublicWorkspace(async ({ req, organizationId }) => {
  try {
    const body = await req.json();
    const validatedData = createContactSchema.parse(body);

    const contact = await ContactService.createContact(
      organizationId,
      validatedData
    );

    return NextResponse.json({ data: contact }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (
        error.message.includes("Maximum") ||
        error.message.includes("Custom field") ||
        error.message.includes("Invalid value") ||
        error.message.includes("at least an email")
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error(
      "[Contacts_POST_ERROR_DEBUG]",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});
