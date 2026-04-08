import { randomUUID } from "crypto";
import { prisma } from "@reachdem/database";
import type {
  CreatePaymentSessionDto,
  CreatePaymentSessionResult,
  PaymentKind,
  PaymentProvider,
  PaymentSessionDetailsResponse,
  PaymentSessionResponse,
  PaymentTransactionResponse,
  ReconcilePaymentSessionDto,
} from "@reachdem/shared";
import { FlutterwavePaymentProvider } from "../integrations/payments/flutterwave.provider";
import {
  PaymentSessionNotFoundError,
  PaymentVerificationError,
  PaymentWebhookSignatureError,
} from "../errors/payment.errors";
import type {
  CreateProviderCheckoutSessionInput,
  PaymentProviderPort,
} from "../ports/payment-provider.port";
import { StripePaymentProvider } from "../integrations/payments/stripe.provider";
import { BillingCatalogService } from "./billing-catalog.service";
import { PaymentFulfillmentService } from "./payment-fulfillment.service";

function getReturnUrl(): string {
  const explicit = process.env.PAYMENT_RETURN_URL?.trim();
  if (explicit) {
    return explicit;
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    process.env.BETTER_AUTH_URL?.trim() ??
    "http://localhost:3000";
  return new URL("/settings/workspace", baseUrl).toString();
}

function mapSession(session: any): PaymentSessionResponse {
  return {
    id: session.id,
    organizationId: session.organizationId,
    initiatedByUserId: session.initiatedByUserId,
    kind: session.kind,
    providerPrimary: session.providerPrimary,
    providerSelected: session.providerSelected ?? null,
    status: session.status,
    currency: session.currency,
    amountMinor: session.amountMinor,
    planCode: session.planCode ?? null,
    creditsQuantity: session.creditsQuantity ?? null,
    providerCheckoutUrl: session.providerCheckoutUrl ?? null,
    providerSessionId: session.providerSessionId ?? null,
    providerReference: session.providerReference ?? null,
    metadata: (session.metadata as Record<string, unknown> | null) ?? null,
    activatedAt: session.activatedAt ?? null,
    failedAt: session.failedAt ?? null,
    cancelledAt: session.cancelledAt ?? null,
    expiredAt: session.expiredAt ?? null,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

function mapTransaction(transaction: any): PaymentTransactionResponse {
  return {
    id: transaction.id,
    paymentSessionId: transaction.paymentSessionId,
    organizationId: transaction.organizationId,
    initiatedByUserId: transaction.initiatedByUserId ?? null,
    provider: transaction.provider,
    status: transaction.status,
    amountMinor: transaction.amountMinor,
    currency: transaction.currency,
    providerTransactionId: transaction.providerTransactionId ?? null,
    providerSessionId: transaction.providerSessionId ?? null,
    providerReference: transaction.providerReference ?? null,
    providerEventId: transaction.providerEventId ?? null,
    rawStatus: transaction.rawStatus ?? null,
    rawPayload:
      (transaction.rawPayload as Record<string, unknown> | null) ?? null,
    confirmedAt: transaction.confirmedAt ?? null,
    failedAt: transaction.failedAt ?? null,
    cancelledAt: transaction.cancelledAt ?? null,
    refundedAt: transaction.refundedAt ?? null,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };
}

function resolveAmountMinor(data: CreatePaymentSessionDto): number {
  if (data.kind === "subscription") {
    return BillingCatalogService.getPlanAmountMinor(data.planCode);
  }

  const minimumQuantity =
    BillingCatalogService.getCreditPricing().minimumQuantity;
  if ((data.creditsQuantity ?? 0) < minimumQuantity) {
    throw new Error(
      `Minimum credit purchase is ${minimumQuantity.toLocaleString()} credits`
    );
  }

  return BillingCatalogService.calculateCreditAmountMinor(
    data.creditsQuantity ?? 0
  );
}

function resolveDescription(data: CreatePaymentSessionDto): string {
  if (data.kind === "subscription") {
    const plan = BillingCatalogService.getPlan(data.planCode);
    return `ReachDem ${plan?.name ?? data.planCode} subscription`;
  }

  return `ReachDem credits purchase (${data.creditsQuantity} credits)`;
}

function normalizeProviderStatus(status: string | null | undefined): {
  sessionStatus: MutableSessionStatus;
  transactionStatus: MutableTransactionStatus;
} {
  const normalized = String(status ?? "").toLowerCase();

  if (
    normalized === "successful" ||
    normalized === "succeeded" ||
    normalized === "completed"
  ) {
    return {
      sessionStatus: "succeeded",
      transactionStatus: "succeeded",
    };
  }

  if (normalized === "failed") {
    return {
      sessionStatus: "failed",
      transactionStatus: "failed",
    };
  }

  if (normalized === "cancelled") {
    return {
      sessionStatus: "cancelled",
      transactionStatus: "cancelled",
    };
  }

  return {
    sessionStatus: "processing",
    transactionStatus: "processing",
  };
}

function createProvider(provider: PaymentProvider): PaymentProviderPort {
  switch (provider) {
    case "flutterwave":
      return new FlutterwavePaymentProvider();
    case "stripe":
      return new StripePaymentProvider();
  }
}

type MutableSessionStatus =
  | "pending"
  | "providerRedirected"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "expired";

type MutableTransactionStatus =
  | "initiated"
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "refunded";

export class PaymentOrchestratorService {
  private static async markSessionAndTransaction(args: {
    paymentSessionId: string;
    transactionId: string;
    provider: PaymentProvider;
    sessionStatus: MutableSessionStatus;
    transactionStatus: MutableTransactionStatus;
    providerSessionId?: string | null;
    providerTransactionId?: string | null;
    providerEventId?: string | null;
    providerReference?: string | null;
    rawStatus?: string | null;
    rawPayload?: Record<string, unknown> | null;
  }): Promise<void> {
    const session = await prisma.paymentSession.findUnique({
      where: { id: args.paymentSessionId },
    });

    if (!session) {
      throw new PaymentSessionNotFoundError();
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.update({
        where: { id: args.transactionId },
        data: {
          status: args.transactionStatus,
          providerSessionId:
            args.providerSessionId !== undefined
              ? args.providerSessionId
              : undefined,
          providerTransactionId:
            args.providerTransactionId !== undefined
              ? args.providerTransactionId
              : undefined,
          providerEventId:
            args.providerEventId !== undefined
              ? args.providerEventId
              : undefined,
          providerReference:
            args.providerReference !== undefined
              ? args.providerReference
              : undefined,
          rawStatus: args.rawStatus !== undefined ? args.rawStatus : undefined,
          rawPayload:
            args.rawPayload !== undefined
              ? (args.rawPayload as any)
              : undefined,
          confirmedAt: args.transactionStatus === "succeeded" ? now : undefined,
          failedAt: args.transactionStatus === "failed" ? now : undefined,
          cancelledAt: args.transactionStatus === "cancelled" ? now : undefined,
          refundedAt: args.transactionStatus === "refunded" ? now : undefined,
        },
      });

      await tx.paymentSession.update({
        where: { id: args.paymentSessionId },
        data: {
          status: args.sessionStatus,
          providerSelected: args.provider,
          providerSessionId:
            args.providerSessionId !== undefined
              ? args.providerSessionId
              : undefined,
          providerReference:
            args.providerReference !== undefined
              ? args.providerReference
              : undefined,
          failedAt: args.sessionStatus === "failed" ? now : undefined,
          cancelledAt: args.sessionStatus === "cancelled" ? now : undefined,
          expiredAt: args.sessionStatus === "expired" ? now : undefined,
        },
      });
    });

    if (args.sessionStatus === "succeeded" && !session.activatedAt) {
      await PaymentFulfillmentService.fulfill({
        paymentSessionId: session.id,
        organizationId: session.organizationId,
        kind: session.kind as PaymentKind,
        planCode: session.planCode,
        creditsQuantity: session.creditsQuantity,
      });
    }
  }

  static async createDirectChargeSession(
    organizationId: string,
    initiatedByUserId: string,
    data: CreatePaymentSessionDto
  ): Promise<{
    paymentSessionId: string;
    transactionId: string;
    amountMinor: number;
    currency: string;
    provider: PaymentProvider;
    providerReference: string;
    description: string;
  }> {
    const amountMinor = resolveAmountMinor(data);
    const providerPrimary: PaymentProvider = "flutterwave";
    const normalizedPlanCode =
      data.kind === "subscription"
        ? BillingCatalogService.normalizePlanCode(data.planCode)
        : null;
    const paymentSessionId = randomUUID();
    const transactionId = randomUUID();
    const providerReference = `pay${paymentSessionId.replace(/-/g, "")}`;
    const description = resolveDescription(data);

    await prisma.paymentSession.create({
      data: {
        id: paymentSessionId,
        organizationId,
        initiatedByUserId,
        kind: data.kind,
        providerPrimary,
        providerSelected: providerPrimary,
        status: "pending",
        currency: data.currency,
        amountMinor,
        planCode: normalizedPlanCode,
        creditsQuantity: data.creditsQuantity ?? null,
        providerReference,
        metadata: (data.metadata ?? null) as any,
      },
    });

    try {
      await prisma.paymentTransaction.create({
        data: {
          id: transactionId,
          paymentSessionId,
          organizationId,
          initiatedByUserId,
          provider: providerPrimary,
          status: "initiated",
          amountMinor,
          currency: data.currency,
          providerReference,
          rawPayload: (data.metadata ?? null) as any,
        },
      });
    } catch (error) {
      await prisma.paymentSession
        .delete({
          where: { id: paymentSessionId },
        })
        .catch(() => undefined);

      throw error;
    }

    return {
      paymentSessionId,
      transactionId,
      amountMinor,
      currency: data.currency,
      provider: providerPrimary,
      providerReference,
      description,
    };
  }

  static async markDirectChargeInitiated(args: {
    organizationId: string;
    paymentSessionId: string;
    transactionId: string;
    providerTransactionId: string;
    providerReference?: string | null;
    rawStatus?: string | null;
    rawPayload?: Record<string, unknown> | null;
    nextActionType?: string | null;
  }): Promise<void> {
    void args.organizationId;
    const normalized = normalizeProviderStatus(args.rawStatus);
    const sessionStatus =
      normalized.sessionStatus === "processing" &&
      args.nextActionType === "redirect_url"
        ? "providerRedirected"
        : normalized.sessionStatus;

    await this.markSessionAndTransaction({
      paymentSessionId: args.paymentSessionId,
      transactionId: args.transactionId,
      provider: "flutterwave",
      sessionStatus,
      transactionStatus: normalized.transactionStatus,
      providerSessionId: args.providerTransactionId,
      providerTransactionId: args.providerTransactionId,
      providerReference: args.providerReference,
      rawStatus: args.rawStatus,
      rawPayload: args.rawPayload,
    });
  }

  static async markDirectChargeFailed(args: {
    paymentSessionId: string;
    transactionId: string;
    providerReference?: string | null;
    rawStatus?: string | null;
    rawPayload?: Record<string, unknown> | null;
  }): Promise<void> {
    await this.markSessionAndTransaction({
      paymentSessionId: args.paymentSessionId,
      transactionId: args.transactionId,
      provider: "flutterwave",
      sessionStatus: "failed",
      transactionStatus: "failed",
      providerReference: args.providerReference,
      rawStatus: args.rawStatus ?? "failed",
      rawPayload: args.rawPayload,
    });
  }

  static async reconcileDirectChargeVerification(args: {
    organizationId: string;
    providerTransactionId: string;
    providerReference?: string | null;
    rawStatus?: string | null;
    rawPayload?: Record<string, unknown> | null;
  }): Promise<PaymentSessionDetailsResponse> {
    const transaction = await prisma.paymentTransaction.findFirst({
      where: {
        organizationId: args.organizationId,
        provider: "flutterwave",
        OR: [
          { providerTransactionId: args.providerTransactionId },
          { providerSessionId: args.providerTransactionId },
          args.providerReference
            ? { providerReference: args.providerReference }
            : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (!transaction) {
      throw new PaymentSessionNotFoundError();
    }

    const normalized = normalizeProviderStatus(args.rawStatus);

    await this.markSessionAndTransaction({
      paymentSessionId: transaction.paymentSessionId,
      transactionId: transaction.id,
      provider: "flutterwave",
      sessionStatus: normalized.sessionStatus,
      transactionStatus: normalized.transactionStatus,
      providerSessionId: args.providerTransactionId,
      providerTransactionId: args.providerTransactionId,
      providerReference:
        args.providerReference ?? transaction.providerReference,
      rawStatus: args.rawStatus,
      rawPayload: args.rawPayload,
    });

    return this.getSessionById(
      args.organizationId,
      transaction.paymentSessionId
    );
  }

  static async createSession(
    organizationId: string,
    initiatedByUserId: string,
    data: CreatePaymentSessionDto
  ): Promise<CreatePaymentSessionResult> {
    const amountMinor = resolveAmountMinor(data);
    const providerPrimary: PaymentProvider = "flutterwave";
    const normalizedPlanCode =
      data.kind === "subscription"
        ? BillingCatalogService.normalizePlanCode(data.planCode)
        : null;
    const user = await prisma.user.findUnique({
      where: { id: initiatedByUserId },
      select: { email: true },
    });

    const session = await prisma.paymentSession.create({
      data: {
        organizationId,
        initiatedByUserId,
        kind: data.kind,
        providerPrimary,
        currency: data.currency,
        amountMinor,
        planCode: normalizedPlanCode,
        creditsQuantity: data.creditsQuantity ?? null,
        metadata: (data.metadata ?? null) as any,
      },
    });

    const provider = createProvider(providerPrimary);

    try {
      const providerInput: CreateProviderCheckoutSessionInput = {
        paymentSessionId: session.id,
        organizationId,
        currency: data.currency,
        amountMinor,
        description: resolveDescription(data),
        returnUrl: getReturnUrl(),
        customerEmail: user?.email ?? null,
        metadata: {
          kind: data.kind,
          planCode: normalizedPlanCode,
          creditsQuantity: data.creditsQuantity ?? null,
          ...(data.metadata ?? {}),
        },
      };

      const result = await provider.createCheckoutSession(providerInput);

      await prisma.$transaction(async (tx) => {
        await tx.paymentSession.update({
          where: { id: session.id },
          data: {
            providerSelected: result.provider,
            status: "providerRedirected",
            providerCheckoutUrl: result.checkoutUrl ?? null,
            providerSessionId: result.providerSessionId ?? null,
            providerReference: result.providerReference ?? null,
          },
        });

        await tx.paymentTransaction.create({
          data: {
            paymentSessionId: session.id,
            organizationId,
            initiatedByUserId,
            provider: result.provider,
            status: "pending",
            amountMinor,
            currency: data.currency,
            providerSessionId: result.providerSessionId ?? null,
            providerReference: result.providerReference ?? null,
            rawPayload: (result.rawPayload ?? null) as any,
          },
        });
      });

      return {
        paymentSessionId: session.id,
        provider: providerPrimary,
        status: "providerRedirected",
        checkoutUrl: result.checkoutUrl ?? null,
      };
    } catch (error) {
      const lastError = error as Error;

      await prisma.paymentSession.update({
        where: { id: session.id },
        data: {
          status: "failed",
          failedAt: new Date(),
        },
      });

      throw lastError;
    }
  }

  static async getSessionById(
    organizationId: string,
    id: string
  ): Promise<PaymentSessionDetailsResponse> {
    const session = await prisma.paymentSession.findFirst({
      where: { id, organizationId },
      include: {
        transactions: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!session) {
      throw new PaymentSessionNotFoundError();
    }

    return {
      session: mapSession(session),
      transactions: session.transactions.map(mapTransaction),
    };
  }

  static async reconcileSession(
    organizationId: string,
    id: string,
    data: ReconcilePaymentSessionDto
  ): Promise<PaymentSessionDetailsResponse> {
    const session = await prisma.paymentSession.findFirst({
      where: { id, organizationId },
      include: {
        transactions: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!session) {
      throw new PaymentSessionNotFoundError();
    }

    const transaction = session.transactions.at(-1);
    if (!transaction) {
      return {
        session: mapSession(session),
        transactions: session.transactions.map(mapTransaction),
      };
    }

    const providerName = (data.provider ??
      session.providerSelected ??
      transaction.provider) as PaymentProvider;

    if (data.cancelled || data.status?.toLowerCase() === "cancelled") {
      await this.markSessionAndTransaction({
        paymentSessionId: session.id,
        transactionId: transaction.id,
        provider: providerName,
        sessionStatus: "cancelled",
        transactionStatus: "cancelled",
        providerTransactionId:
          data.providerTransactionId ?? transaction.providerTransactionId,
        providerReference:
          data.providerReference ?? transaction.providerReference,
        rawStatus: data.status ?? "cancelled",
      });
      return this.getSessionById(organizationId, id);
    }

    if (
      data.status?.toLowerCase() === "failed" &&
      !data.providerTransactionId
    ) {
      await this.markSessionAndTransaction({
        paymentSessionId: session.id,
        transactionId: transaction.id,
        provider: providerName,
        sessionStatus: "failed",
        transactionStatus: "failed",
        providerReference:
          data.providerReference ?? transaction.providerReference,
        rawStatus: data.status,
      });
      return this.getSessionById(organizationId, id);
    }

    const provider = createProvider(providerName);
    if (
      typeof provider.verifyTransaction !== "function" ||
      (!data.providerTransactionId && !transaction.providerTransactionId)
    ) {
      return {
        session: mapSession(session),
        transactions: session.transactions.map(mapTransaction),
      };
    }

    const verification = await provider.verifyTransaction({
      providerReference:
        data.providerReference ?? transaction.providerReference,
      providerTransactionId:
        data.providerTransactionId ?? transaction.providerTransactionId,
      expectedAmountMinor: transaction.amountMinor,
      expectedCurrency: transaction.currency,
    });

    if (verification.verified) {
      await this.markSessionAndTransaction({
        paymentSessionId: session.id,
        transactionId: transaction.id,
        provider: providerName,
        sessionStatus: "succeeded",
        transactionStatus: "succeeded",
        providerTransactionId:
          verification.providerTransactionId ??
          transaction.providerTransactionId,
        providerReference:
          verification.providerReference ?? transaction.providerReference,
        rawStatus: verification.rawStatus ?? data.status ?? "successful",
        rawPayload: verification.rawPayload,
      });

      return this.getSessionById(organizationId, id);
    }

    const status = (verification.rawStatus ?? data.status ?? "").toLowerCase();
    if (status === "failed") {
      await this.markSessionAndTransaction({
        paymentSessionId: session.id,
        transactionId: transaction.id,
        provider: providerName,
        sessionStatus: "failed",
        transactionStatus: "failed",
        providerTransactionId:
          verification.providerTransactionId ??
          transaction.providerTransactionId,
        providerReference:
          verification.providerReference ?? transaction.providerReference,
        rawStatus: verification.rawStatus ?? data.status ?? "failed",
        rawPayload: verification.rawPayload,
      });
    }

    return this.getSessionById(organizationId, id);
  }

  static async processWebhook(
    providerName: PaymentProvider,
    rawBody: string,
    headers: Headers
  ): Promise<void> {
    const provider = createProvider(providerName);
    const signatureValid = await provider.verifyWebhookSignature(
      rawBody,
      headers
    );

    if (!signatureValid) {
      throw new PaymentWebhookSignatureError();
    }

    const parsed = await provider.parseWebhookEvent(rawBody, headers);

    const existingEvent = parsed.providerEventId
      ? await prisma.paymentWebhookEvent.findFirst({
          where: {
            provider: providerName,
            providerEventId: parsed.providerEventId,
          },
        })
      : null;

    if (existingEvent?.processed) {
      return;
    }

    const webhookEvent = existingEvent
      ? await prisma.paymentWebhookEvent.update({
          where: { id: existingEvent.id },
          data: {
            signatureValid,
            rawPayload: parsed.rawPayload as any,
            providerReference: parsed.providerReference ?? null,
            providerSignature:
              headers.get("verif-hash") ?? headers.get("stripe-signature"),
          },
        })
      : await prisma.paymentWebhookEvent.create({
          data: {
            provider: providerName,
            providerEventId: parsed.providerEventId ?? null,
            providerReference: parsed.providerReference ?? null,
            providerSignature:
              headers.get("verif-hash") ?? headers.get("stripe-signature"),
            signatureValid,
            rawPayload: parsed.rawPayload as any,
          },
        });

    const transaction = await prisma.paymentTransaction.findFirst({
      where: {
        provider: providerName,
        OR: [
          parsed.providerReference
            ? { providerReference: parsed.providerReference }
            : undefined,
          parsed.providerTransactionId
            ? { providerTransactionId: parsed.providerTransactionId }
            : undefined,
          parsed.providerReference
            ? { providerSessionId: parsed.providerReference }
            : undefined,
        ].filter(Boolean) as any,
      },
      include: {
        paymentSession: true,
      },
    });

    if (!transaction) {
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });
      return;
    }

    if (
      parsed.normalizedSessionStatus === "succeeded" &&
      typeof provider.verifyTransaction === "function"
    ) {
      const verification = await provider.verifyTransaction({
        providerReference:
          parsed.providerReference ?? transaction.providerReference,
        providerTransactionId:
          parsed.providerTransactionId ?? transaction.providerTransactionId,
        expectedAmountMinor: transaction.amountMinor,
        expectedCurrency: transaction.currency,
      });

      if (!verification.verified) {
        throw new PaymentVerificationError(
          `Payment verification failed for ${providerName}`
        );
      }
    }

    await this.markSessionAndTransaction({
      paymentSessionId: transaction.paymentSessionId,
      transactionId: transaction.id,
      provider: providerName,
      sessionStatus: parsed.normalizedSessionStatus,
      transactionStatus: parsed.normalizedTransactionStatus,
      providerTransactionId:
        parsed.providerTransactionId ?? transaction.providerTransactionId,
      providerEventId: parsed.providerEventId ?? null,
      providerReference:
        parsed.providerReference ?? transaction.providerReference,
      rawStatus: parsed.rawStatus ?? null,
      rawPayload: parsed.rawPayload,
    });

    await prisma.paymentWebhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });
  }
}
