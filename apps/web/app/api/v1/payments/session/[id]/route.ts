import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";
import {
  PaymentOrchestratorService,
  PaymentSessionNotFoundError,
} from "@reachdem/core";
import { reconcilePaymentSessionSchema } from "@reachdem/shared";

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
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});

export const POST = withWorkspace(async ({ req, organizationId, params }) => {
  try {
    const id = params.id as string;
    const body = await req.json().catch(() => ({}));
    const validation = reconcilePaymentSessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation Error", details: validation.error.format() },
        { status: 400 }
      );
    }

    const result = await PaymentOrchestratorService.reconcileSession(
      organizationId,
      id,
      validation.data
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Payments API - POST /session/:id] Error:", error);
    if (error instanceof PaymentSessionNotFoundError) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});
