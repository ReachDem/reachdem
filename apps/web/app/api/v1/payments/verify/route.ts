import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";
import {
  DirectChargePaymentService,
  PaymentSessionNotFoundError,
} from "@reachdem/core";

export const GET = withWorkspace(async ({ req, organizationId }) => {
  try {
    const url = new URL(req.url);
    const chargeId = url.searchParams.get("chargeId");

    if (!chargeId) {
      return NextResponse.json(
        { error: "Missing chargeId parameter" },
        { status: 400 }
      );
    }

    const result = await DirectChargePaymentService.verify(
      organizationId,
      chargeId
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Payments API - GET /verify] Error:", error);

    if (error instanceof PaymentSessionNotFoundError) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Verification Failed", message: error.message },
      { status: 500 }
    );
  }
});
