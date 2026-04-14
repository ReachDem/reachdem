import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";
import {
  EnqueueEmailUseCase,
  MessageInsufficientCreditsError,
} from "@reachdem/core";
import { sendEmailSchema } from "@reachdem/shared";
import { publishEmailJob } from "../../../../../lib/publish-email-job";

export const POST = withWorkspace(async ({ req, organizationId }) => {
  try {
    const body = await req.json();
    const parsed = sendEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await EnqueueEmailUseCase.execute(
      organizationId,
      parsed.data,
      publishEmailJob
    );

    return NextResponse.json(result, {
      status: result.idempotent ? 200 : 201,
    });
  } catch (error) {
    if (error instanceof MessageInsufficientCreditsError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[POST /email/send]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
