import { NextResponse } from "next/server";
import { withPublicWorkspace } from "@reachdem/auth/guards";
import { MessageService } from "@reachdem/core";

export const GET = withPublicWorkspace(async ({ organizationId, params }) => {
  try {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;

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

    console.error("[GET /v1/messages/:id]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
