import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";
import { createPaymentSessionSchema } from "@reachdem/shared";
import { PaymentOrchestratorService } from "@reachdem/core";

export const POST = withWorkspace(async ({ req, organizationId, userId }) => {
  try {
    const body = await req.json();
    const validation = createPaymentSessionSchema.safeParse({
      ...body,
      organizationId,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation Error", details: validation.error.format() },
        { status: 400 }
      );
    }

    const result = await PaymentOrchestratorService.createSession(
      organizationId,
      userId,
      validation.data
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("[Payments API - POST /session] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});
