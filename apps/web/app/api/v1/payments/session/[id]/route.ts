import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";
import {
  PaymentOrchestratorService,
  PaymentSessionNotFoundError,
} from "@reachdem/core";

export const GET = withWorkspace(async ({ organizationId, params }) => {
  try {
    const id = params.id as string;
    const result = await PaymentOrchestratorService.getSessionById(
      organizationId,
      id
    );
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Payments API - GET /session/:id] Error:", error);
    if (error instanceof PaymentSessionNotFoundError) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
});
