import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";
import { DirectChargePaymentService } from "@reachdem/core";
import { createDirectChargeSchema } from "@reachdem/shared";

export const POST = withWorkspace(async ({ req, organizationId, userId }) => {
  try {
    const body = await req.json();
    const validation = createDirectChargeSchema.safeParse({
      ...body,
      organizationId,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation Error", details: validation.error.format() },
        { status: 400 }
      );
    }

    const appBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "http://localhost:3000";
    const result = await DirectChargePaymentService.initiate(
      organizationId,
      userId,
      validation.data,
      appBaseUrl
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("[Payments API - POST /charge] Error:", error);

    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
});
