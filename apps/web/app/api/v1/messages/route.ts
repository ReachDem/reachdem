import { NextResponse } from "next/server";
import { withPublicWorkspace } from "@reachdem/auth/guards";
import { MessageService } from "@reachdem/core";
import { listMessagesSchema } from "@reachdem/shared";

export const GET = withPublicWorkspace(async ({ req, organizationId }) => {
  try {
    const url = new URL(req.url);
    const parsed = listMessagesSchema.safeParse(
      Object.fromEntries(url.searchParams)
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await MessageService.listMessages(
      organizationId,
      parsed.data
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /v1/messages]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
