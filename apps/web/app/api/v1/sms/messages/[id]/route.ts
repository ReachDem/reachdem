import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";
import { MessageService } from "@reachdem/core";

export const GET = withWorkspace(async ({ req, organizationId, params }) => {
  try {
    const resolvedParams = await params;
    const id = Array.isArray(resolvedParams.id)
      ? resolvedParams.id[0]
      : resolvedParams.id;

    if (!id) {
      return NextResponse.json(
        { error: "Message ID is required" },
        { status: 400 }
      );
    }

    const message = await MessageService.getMessageById(organizationId, id);
    return NextResponse.json(message);
  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    console.error("[GET /sms/messages/:id]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
