import type {
  AuthorizeDirectChargeDto,
  CreateDirectChargeDto,
  DirectChargeResponse,
  PaymentMethodType,
  VerifyDirectChargeResponse,
} from "@reachdem/shared";
import { getFlutterwaveChargeFailureInsight } from "@reachdem/shared";
import { ActivityLogger } from "./activity-logger.service";
import { CreditTopUpService } from "./credit-top-up.service";
import { PaymentAdapterRegistryService } from "./payment-adapter-registry.service";
import { PaymentOrchestratorService } from "./payment-orchestrator.service";
import { WorkspacePaymentMethodService } from "./workspace-payment-method.service";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function extractChargeData(
  payload: Record<string, unknown> | null | undefined
) {
  const root = asRecord(payload);
  const data = asRecord(root?.data);

  if (!data) {
    throw new Error("Flutterwave did not return a valid charge response.");
  }

  return data;
}

function extractChargeStatus(chargeData: Record<string, unknown>): string {
  return typeof chargeData.status === "string"
    ? chargeData.status.toLowerCase()
    : "processing";
}

function extractChargeReference(
  chargeData: Record<string, unknown>
): string | null {
  if (typeof chargeData.reference === "string") {
    return chargeData.reference;
  }

  if (typeof chargeData.tx_ref === "string") {
    return chargeData.tx_ref;
  }

  return null;
}

function isSuccessfulChargeStatus(status: string): boolean {
  return (
    status === "successful" || status === "succeeded" || status === "completed"
  );
}

function isFinalChargeStatus(status: string): boolean {
  return (
    isSuccessfulChargeStatus(status) ||
    status === "failed" ||
    status === "cancelled"
  );
}

function requiresCustomerAction(
  nextAction: Record<string, unknown> | null | undefined
): boolean {
  const type =
    nextAction && typeof nextAction.type === "string"
      ? nextAction.type.toLowerCase()
      : null;

  return Boolean(
    type &&
    (type === "redirect_url" ||
      type === "requires_pin" ||
      type === "pin" ||
      type === "requires_otp" ||
      type === "otp")
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class DirectChargePaymentService {
  private static async logChargeActivity(args: {
    organizationId: string;
    actorId?: string;
    paymentSessionId: string;
    paymentMethodType: PaymentMethodType;
    amountMinor?: number;
    currency?: string;
    phase: "initiate" | "authorize" | "verify" | "error";
    chargeData?: Record<string, unknown> | null;
    fallbackMessage?: string | null;
  }) {
    const chargeData = args.chargeData ?? null;
    const chargeId =
      chargeData?.id !== undefined ? String(chargeData.id) : undefined;
    const chargeStatus = chargeData
      ? extractChargeStatus(chargeData)
      : "failed";
    const nextActionType =
      chargeData &&
      typeof chargeData.next_action === "object" &&
      chargeData.next_action &&
      typeof (chargeData.next_action as Record<string, unknown>).type ===
        "string"
        ? String((chargeData.next_action as Record<string, unknown>).type)
        : null;
    const failureInsight = getFlutterwaveChargeFailureInsight(chargeData);
    const eventAction =
      chargeStatus === "failed" || chargeStatus === "cancelled"
        ? "provider_error"
        : chargeStatus === "successful" ||
            chargeStatus === "succeeded" ||
            chargeStatus === "completed"
          ? "updated"
          : args.phase === "initiate"
            ? "created"
            : "updated";
    const eventStatus =
      chargeStatus === "failed" || chargeStatus === "cancelled"
        ? "failed"
        : chargeStatus === "successful" ||
            chargeStatus === "succeeded" ||
            chargeStatus === "completed"
          ? "success"
          : "pending";
    const severity =
      eventStatus === "failed"
        ? failureInsight?.retryable
          ? "warn"
          : "error"
        : "info";

    await ActivityLogger.logOnce({
      organizationId: args.organizationId,
      actorType: args.actorId ? "user" : "system",
      actorId: args.actorId,
      category: "billing",
      action: eventAction,
      provider: "flutterwave",
      providerRequestId: chargeId,
      correlationId: args.paymentSessionId,
      idempotencyKey: [
        "billing",
        args.paymentSessionId,
        args.phase,
        chargeStatus,
        chargeId ?? "none",
        nextActionType ?? "none",
        failureInsight?.processorCode ?? "none",
        failureInsight?.processorType ?? "none",
      ].join(":"),
      severity,
      status: eventStatus,
      meta: {
        amountMinor: args.amountMinor ?? null,
        currency: args.currency ?? null,
        paymentMethodType: args.paymentMethodType,
        paymentSessionId: args.paymentSessionId,
        chargeId: chargeId ?? null,
        providerReference: chargeData
          ? extractChargeReference(chargeData)
          : null,
        chargeStatus,
        nextActionType,
        processorCode: failureInsight?.processorCode ?? null,
        processorType: failureInsight?.processorType ?? null,
        processorLabel: failureInsight?.processorLabel ?? null,
        userMessage:
          failureInsight?.userMessage ?? args.fallbackMessage ?? null,
        internalMessage:
          failureInsight?.backofficeMessage ?? args.fallbackMessage ?? null,
      },
    }).catch((error) => {
      console.error(
        "[DirectChargePaymentService] Failed to write billing activity event:",
        error
      );
    });
  }

  private static async persistSavedPaymentMethod(args: {
    organizationId: string;
    shouldSave: boolean;
    chargeData: Record<string, unknown>;
    payload: Record<string, unknown> | null | undefined;
    context: string;
  }): Promise<void> {
    if (
      !args.shouldSave ||
      !isSuccessfulChargeStatus(extractChargeStatus(args.chargeData))
    ) {
      return;
    }

    await WorkspacePaymentMethodService.saveFromChargePayload({
      organizationId: args.organizationId,
      payload: args.payload,
    }).catch((error) => {
      console.error(
        `[DirectChargePaymentService] Unable to persist Flutterwave payment method ${args.context}:`,
        error
      );
    });
  }

  private static async reconcileVerificationPayload(args: {
    organizationId: string;
    chargeId: string;
    payload: Record<string, unknown> | null | undefined;
  }) {
    const verificationResult = (args.payload ?? null) as
      | Record<string, unknown>
      | null
      | undefined;
    const chargeData = extractChargeData(verificationResult);
    const status = extractChargeStatus(chargeData);
    const providerReference = extractChargeReference(chargeData);
    const session =
      await PaymentOrchestratorService.reconcileDirectChargeVerification({
        organizationId: args.organizationId,
        providerTransactionId: args.chargeId,
        providerReference,
        rawStatus: status,
        rawPayload: (verificationResult ?? null) as any,
      });

    return {
      chargeData,
      session,
      status,
      verificationResult,
    };
  }

  private static async settleCardCharge(args: {
    organizationId: string;
    chargeId: string;
    initialPayload: Record<string, unknown> | null | undefined;
    initialChargeData: Record<string, unknown>;
  }) {
    let payload = (args.initialPayload ?? null) as Record<
      string,
      unknown
    > | null;
    let chargeData = args.initialChargeData;
    let nextAction = asRecord(chargeData.next_action);
    let status = extractChargeStatus(chargeData);

    if (isFinalChargeStatus(status) || requiresCustomerAction(nextAction)) {
      return {
        chargeData,
        payload,
      };
    }

    const provider =
      PaymentAdapterRegistryService.getDirectChargeProvider("flutterwave");

    for (let attempt = 0; attempt < 8; attempt += 1) {
      await delay(1500);

      try {
        const verification = await provider.verifyDirectCharge({
          chargeId: args.chargeId,
        });
        const reconciled = await this.reconcileVerificationPayload({
          organizationId: args.organizationId,
          chargeId: args.chargeId,
          payload: verification.data,
        });

        payload = (reconciled.verificationResult ?? null) as Record<
          string,
          unknown
        > | null;
        chargeData = reconciled.chargeData;
        nextAction = asRecord(chargeData.next_action);
        status = reconciled.status;

        if (isFinalChargeStatus(status) || requiresCustomerAction(nextAction)) {
          break;
        }
      } catch (error) {
        console.error(
          "[DirectChargePaymentService] Card charge settlement retry failed:",
          error
        );
        break;
      }
    }

    return {
      chargeData,
      payload,
    };
  }

  static async initiate(
    organizationId: string,
    initiatedByUserId: string,
    input: CreateDirectChargeDto,
    appBaseUrl: string
  ): Promise<DirectChargeResponse> {
    const quote = CreditTopUpService.quoteFromEnteredAmount(
      input.amountMinor,
      input.currency
    );

    let directChargeSession: {
      paymentSessionId: string;
      transactionId: string;
      amountMinor: number;
      currency: string;
      providerReference: string;
      description: string;
    } | null = null;

    try {
      directChargeSession =
        await PaymentOrchestratorService.createDirectChargeSession({
          organizationId,
          initiatedByUserId,
          kind: "creditPurchase",
          currency: input.currency,
          amountMinor: input.amountMinor,
          metadata: {
            ...(input.metadata ?? {}),
            paymentMethodType: input.paymentMethodType,
            savePaymentMethodRequested: Boolean(input.card?.saveCard),
            topUpQuote: quote,
          },
          description: `ReachDem balance top up (${input.amountMinor.toLocaleString()} ${input.currency})`,
        });

      const provider =
        PaymentAdapterRegistryService.getDirectChargeProvider("flutterwave");
      const result = await provider.initiateDirectCharge({
        type: input.paymentMethodType,
        amountMinor: directChargeSession.amountMinor,
        currency: directChargeSession.currency,
        customerName: input.customerName,
        email: input.email,
        phone: input.phone,
        address: input.address,
        mobileMoneyNetwork: input.mobileMoneyNetwork,
        accountBank: input.accountBank,
        returnUrl: `${appBaseUrl.replace(/\/+$/, "")}/payment/callback`,
        reference: directChargeSession.providerReference,
        card: input.card,
      });
      const providerPayload = (result?.data ?? null) as Record<
        string,
        unknown
      > | null;
      const chargeData = extractChargeData(providerPayload);
      const nextAction = asRecord(chargeData.next_action);
      const providerTransactionId =
        chargeData?.id !== undefined ? String(chargeData.id) : null;
      const rawStatus =
        typeof chargeData?.status === "string" ? chargeData.status : "pending";

      if (!providerTransactionId) {
        throw new Error("Flutterwave v4 did not return a charge identifier.");
      }

      await PaymentOrchestratorService.markDirectChargeInitiated({
        organizationId,
        paymentSessionId: directChargeSession.paymentSessionId,
        transactionId: directChargeSession.transactionId,
        providerTransactionId,
        providerReference:
          typeof chargeData?.reference === "string"
            ? chargeData.reference
            : directChargeSession.providerReference,
        rawStatus,
        rawPayload: providerPayload,
        nextActionType:
          typeof nextAction?.type === "string" ? nextAction.type : null,
      });

      let responsePayload = providerPayload;
      let responseChargeData = chargeData;

      if (input.paymentMethodType === "card") {
        const settled = await this.settleCardCharge({
          organizationId,
          chargeId: providerTransactionId,
          initialPayload: providerPayload,
          initialChargeData: chargeData,
        });

        responsePayload = settled.payload;
        responseChargeData = settled.chargeData;
      }

      await this.persistSavedPaymentMethod({
        organizationId,
        shouldSave: Boolean(input.card?.saveCard),
        chargeData: responseChargeData,
        payload: responsePayload,
        context: "after charge initiation",
      });
      await this.logChargeActivity({
        organizationId,
        actorId: initiatedByUserId,
        paymentSessionId: directChargeSession.paymentSessionId,
        paymentMethodType: input.paymentMethodType,
        amountMinor: input.amountMinor,
        currency: input.currency,
        phase: "initiate",
        chargeData: responseChargeData,
      });

      return {
        success: true,
        paymentSessionId: directChargeSession.paymentSessionId,
        next_action: (asRecord(responseChargeData.next_action) ?? null) as any,
        data: responseChargeData,
      };
    } catch (error: any) {
      if (directChargeSession) {
        await PaymentOrchestratorService.markDirectChargeFailed({
          paymentSessionId: directChargeSession.paymentSessionId,
          transactionId: directChargeSession.transactionId,
          providerReference: directChargeSession.providerReference,
          rawStatus: "failed",
          rawPayload: {
            message:
              error?.message ?? "Unable to initiate Flutterwave v4 charge",
          },
        }).catch((markError) => {
          console.error(
            "[DirectChargePaymentService] Failed to persist charge failure:",
            markError
          );
        });

        await this.logChargeActivity({
          organizationId,
          actorId: initiatedByUserId,
          paymentSessionId: directChargeSession.paymentSessionId,
          paymentMethodType: input.paymentMethodType,
          amountMinor: input.amountMinor,
          currency: input.currency,
          phase: "error",
          fallbackMessage:
            error?.message ?? "Unable to initiate Flutterwave v4 charge",
        });
      }

      throw error;
    }
  }

  static async verify(
    organizationId: string,
    chargeId: string
  ): Promise<VerifyDirectChargeResponse> {
    const provider =
      PaymentAdapterRegistryService.getDirectChargeProvider("flutterwave");
    const verification = await provider.verifyDirectCharge({ chargeId });
    const reconciled = await this.reconcileVerificationPayload({
      organizationId,
      chargeId,
      payload: verification.data,
    });
    const { chargeData, session, verificationResult } = reconciled;

    const savePaymentMethodRequested = Boolean(
      asRecord(session.session.metadata)?.savePaymentMethodRequested
    );

    await this.persistSavedPaymentMethod({
      organizationId,
      shouldSave: savePaymentMethodRequested,
      chargeData,
      payload: verificationResult,
      context: "after verification",
    });
    await this.logChargeActivity({
      organizationId,
      actorId: session.session.initiatedByUserId,
      paymentSessionId: session.session.id,
      paymentMethodType:
        (asRecord(session.session.metadata)
          ?.paymentMethodType as PaymentMethodType) ?? "card",
      amountMinor: session.session.amountMinor,
      currency: session.session.currency,
      phase: "verify",
      chargeData,
    });

    return {
      success: session.session.status === "succeeded",
      status: session.session.status,
      data: chargeData,
      paymentSessionId: session.session.id,
    };
  }

  static async authorize(
    organizationId: string,
    chargeId: string,
    input: AuthorizeDirectChargeDto
  ): Promise<DirectChargeResponse> {
    const provider =
      PaymentAdapterRegistryService.getDirectChargeProvider("flutterwave");
    const result = await provider.authorizeDirectCharge({
      chargeId,
      authorization:
        input.type === "pin"
          ? {
              type: "pin",
              pin: input.pin!,
            }
          : {
              type: "otp",
              otp: input.otp!,
            },
    });
    const payload = (result.data ?? null) as Record<string, unknown> | null;
    const chargeData = extractChargeData(payload);
    const nextAction = asRecord(chargeData.next_action);

    if (
      typeof chargeData.id !== "string" &&
      typeof chargeData.id !== "number"
    ) {
      throw new Error("Flutterwave did not return a charge identifier.");
    }

    let reconciled = await this.reconcileVerificationPayload({
      organizationId,
      chargeId,
      payload,
    });
    let responsePayload = payload;
    let responseChargeData = chargeData;

    if (
      !isFinalChargeStatus(reconciled.status) &&
      !requiresCustomerAction(asRecord(responseChargeData.next_action))
    ) {
      const settled = await this.settleCardCharge({
        organizationId,
        chargeId,
        initialPayload: payload,
        initialChargeData: chargeData,
      });

      responsePayload = settled.payload;
      responseChargeData = settled.chargeData;
      reconciled = await this.reconcileVerificationPayload({
        organizationId,
        chargeId,
        payload: responsePayload,
      });
    }

    const savePaymentMethodRequested = Boolean(
      asRecord(reconciled.session.session.metadata)?.savePaymentMethodRequested
    );

    await this.persistSavedPaymentMethod({
      organizationId,
      shouldSave: savePaymentMethodRequested,
      chargeData: responseChargeData,
      payload: responsePayload,
      context: "after authorization",
    });
    await this.logChargeActivity({
      organizationId,
      actorId: reconciled.session.session.initiatedByUserId,
      paymentSessionId: reconciled.session.session.id,
      paymentMethodType:
        (asRecord(reconciled.session.session.metadata)
          ?.paymentMethodType as PaymentMethodType) ?? "card",
      amountMinor: reconciled.session.session.amountMinor,
      currency: reconciled.session.session.currency,
      phase: "authorize",
      chargeData: responseChargeData,
    });

    return {
      success: true,
      paymentSessionId: reconciled.session.session.id,
      next_action: (asRecord(responseChargeData.next_action) ?? null) as any,
      data: responseChargeData,
    };
  }
}
