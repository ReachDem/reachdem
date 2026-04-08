import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";
import {
  FlutterwaveV4PaymentProvider,
  PaymentOrchestratorService,
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

    const providerV4 = new FlutterwaveV4PaymentProvider();
    const verificationResult = await providerV4.verifyTransaction(chargeId);
    const status =
      typeof verificationResult?.data?.status === "string"
        ? verificationResult.data.status
        : "processing";
    const providerReference =
      typeof verificationResult?.data?.reference === "string"
        ? verificationResult.data.reference
        : typeof verificationResult?.data?.tx_ref === "string"
          ? verificationResult.data.tx_ref
          : null;

    const session =
      await PaymentOrchestratorService.reconcileDirectChargeVerification({
        organizationId,
        providerTransactionId: chargeId,
        providerReference,
        rawStatus: status,
        rawPayload: (verificationResult ?? null) as Record<string, unknown>,
      });

    return NextResponse.json({
      success: session.session.status === "succeeded",
      status: session.session.status,
      data: verificationResult?.data,
      paymentSessionId: session.session.id,
    });
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
