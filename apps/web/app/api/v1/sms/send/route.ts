import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";
import { EnqueueSmsUseCase } from "@reachdem/core";
import { sendSmsSchema } from "@reachdem/shared";
import { publishSmsJob } from "../../../../../lib/publish-sms-job";

export const POST = withWorkspace(async ({ req, organizationId }) => {
  try {
    const body = await req.json();
    const parsed = sendSmsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await EnqueueSmsUseCase.execute(
      organizationId,
      parsed.data,
      publishSmsJob
    );

    return NextResponse.json(result, {
      status: result.idempotent ? 200 : 201,
    });
  } catch (error: any) {
    if (error.message?.startsWith("No SMS provider configured")) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error("[POST /sms/send]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
