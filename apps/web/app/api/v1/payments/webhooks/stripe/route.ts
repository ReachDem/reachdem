import { NextRequest, NextResponse } from "next/server";
import {
  PaymentOrchestratorService,
  PaymentWebhookSignatureError,
} from "@reachdem/core";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    await PaymentOrchestratorService.processWebhook(
      "stripe",
      rawBody,
      req.headers
    );
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[Payments Webhook - Stripe] Error:", error);
    if (error instanceof PaymentWebhookSignatureError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
