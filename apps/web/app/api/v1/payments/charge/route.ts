import { NextResponse } from "next/server";
import { z } from "zod";
import { withWorkspace } from "@reachdem/auth/guards";
import {
  FlutterwaveV4PaymentProvider,
  PaymentOrchestratorService,
  type ChargeRequestBody,
} from "@reachdem/core";
import { createPaymentSessionSchema } from "@reachdem/shared";

const chargeApiSchema = z.intersection(
  createPaymentSessionSchema,
  z.object({
    amountMinor: z.number().optional(),
    paymentMethodType: z.enum(["card", "opay", "mobile_money", "ussd"]),
    customerName: z.object({ first: z.string(), last: z.string() }),
    email: z.string().email(),
    phone: z.object({ countryCode: z.string(), number: z.string() }),
    mobileMoneyNetwork: z.string().optional(),
    accountBank: z.string().optional(),
  })
);

export const POST = withWorkspace(async ({ req, organizationId, userId }) => {
  let directChargeSession: {
    paymentSessionId: string;
    transactionId: string;
    amountMinor: number;
    currency: string;
    providerReference: string;
    description: string;
  } | null = null;

  try {
    const body = await req.json();
    const validation = chargeApiSchema.safeParse({
      ...body,
      organizationId,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation Error", details: validation.error.format() },
        { status: 400 }
      );
    }

    directChargeSession =
      await PaymentOrchestratorService.createDirectChargeSession(
        organizationId,
        userId,
        {
          kind: validation.data.kind,
          organizationId: validation.data.organizationId,
          currency: validation.data.currency,
          planCode: validation.data.planCode,
          creditsQuantity: validation.data.creditsQuantity,
          metadata: validation.data.metadata,
        }
      );

    const providerV4 = new FlutterwaveV4PaymentProvider();
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "http://localhost:3000";

    const chargeBody: ChargeRequestBody = {
      type: validation.data.paymentMethodType,
      amount: directChargeSession.amountMinor / 100,
      currency: directChargeSession.currency,
      customerName: validation.data.customerName,
      email: validation.data.email,
      phone: validation.data.phone,
      mobileMoneyNetwork: validation.data.mobileMoneyNetwork,
      accountBank: validation.data.accountBank,
      returnUrl: `${baseUrl}/payment/callback`,
      reference: directChargeSession.providerReference,
    };

    const result = await providerV4.initiateDirectCharge(chargeBody);
    const providerTransactionId =
      result?.data?.id !== undefined ? String(result.data.id) : null;
    const rawStatus =
      typeof result?.data?.status === "string" ? result.data.status : "pending";

    if (!providerTransactionId) {
      throw new Error("Flutterwave v4 did not return a charge identifier.");
    }

    await PaymentOrchestratorService.markDirectChargeInitiated({
      organizationId,
      paymentSessionId: directChargeSession.paymentSessionId,
      transactionId: directChargeSession.transactionId,
      providerTransactionId,
      providerReference:
        typeof result?.data?.reference === "string"
          ? result.data.reference
          : directChargeSession.providerReference,
      rawStatus,
      rawPayload: (result ?? null) as Record<string, unknown> | null,
      nextActionType:
        typeof result?.data?.next_action?.type === "string"
          ? result.data.next_action.type
          : null,
    });

    return NextResponse.json(
      {
        success: true,
        paymentSessionId: directChargeSession.paymentSessionId,
        next_action: result?.data?.next_action,
        data: result?.data,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (directChargeSession) {
      await PaymentOrchestratorService.markDirectChargeFailed({
        paymentSessionId: directChargeSession.paymentSessionId,
        transactionId: directChargeSession.transactionId,
        providerReference: directChargeSession.providerReference,
        rawStatus: "failed",
        rawPayload: {
          message: error?.message ?? "Unable to initiate Flutterwave v4 charge",
        },
      }).catch((markError) => {
        console.error(
          "[Payments API - POST /charge] Failed to persist charge failure:",
          markError
        );
      });
    }

    console.error("[Payments API - POST /charge] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
});
