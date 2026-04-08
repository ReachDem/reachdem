import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";
import { DirectChargePaymentService } from "@reachdem/core";
import { authorizeDirectChargeSchema } from "@reachdem/shared";

export const POST = withWorkspace(async ({ req, organizationId, params }) => {
  try {
    const body = await req.json();
    const validation = authorizeDirectChargeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation Error", details: validation.error.format() },
        { status: 400 }
      );
    }

    const result = await DirectChargePaymentService.authorize(
      organizationId,
      params.chargeId as string,
      validation.data
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(
      "[Payments API - POST /charge/:chargeId/authorize] Error:",
      error
    );

    return NextResponse.json(
      { error: "Authorization Failed", message: error.message },
      { status: 500 }
    );
  }
});
