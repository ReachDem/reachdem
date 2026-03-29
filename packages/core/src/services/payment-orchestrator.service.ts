import { prisma } from "@reachdem/database";
import type {
  CreatePaymentSessionDto,
  CreatePaymentSessionResult,
  PaymentKind,
  PaymentProvider,
  PaymentSessionDetailsResponse,
  PaymentSessionResponse,
  PaymentTransactionResponse,
} from "@reachdem/shared";
import { FlutterwavePaymentProvider } from "../integrations/payments/flutterwave.provider";
import {
  PaymentVerificationError,
  PaymentSessionNotFoundError,
  PaymentWebhookSignatureError,
} from "../errors/payment.errors";
import type {
  CreateProviderCheckoutSessionInput,
  PaymentProviderPort,
} from "../ports/payment-provider.port";
import { PaymentFulfillmentService } from "./payment-fulfillment.service";
import { StripePaymentProvider } from "../integrations/payments/stripe.provider";

const PLAN_AMOUNT_ENV_PREFIX = "PAYMENT_PLAN_";
const CREDIT_UNIT_AMOUNT_ENV = "PAYMENT_CREDIT_UNIT_AMOUNT_MINOR";

function getReturnUrl(): string {
  return (
    process.env.PAYMENT_RETURN_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000/dashboard/billing"
  );
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

function getPlanAmountMinor(planCode: string): number {
  const envKey = `${PLAN_AMOUNT_ENV_PREFIX}${planCode.toUpperCase()}_AMOUNT_MINOR`;
  const raw = process.env[envKey];
  const amount = Number(raw);
  if (!raw || !Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Missing or invalid plan amount env: ${envKey}`);
  }
  return amount;
}

function getCreditUnitAmountMinor(): number {
  const raw = process.env[CREDIT_UNIT_AMOUNT_ENV] ?? "1";
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Missing or invalid ${CREDIT_UNIT_AMOUNT_ENV}`);
  }
  return amount;
}

function resolveAmountMinor(data: CreatePaymentSessionDto): number {
  if (data.kind === "subscription") {
    return getPlanAmountMinor(data.planCode!);
  }
  return getCreditUnitAmountMinor() * (data.creditsQuantity ?? 0);
}

function resolveDescription(data: CreatePaymentSessionDto): string {
  if (data.kind === "subscription") {
    return `ReachDem subscription for plan ${data.planCode}`;
  }
  return `ReachDem credits purchase (${data.creditsQuantity} credits)`;
}

function createProvider(provider: PaymentProvider): PaymentProviderPort {
  switch (provider) {
    case "flutterwave":
      return new FlutterwavePaymentProvider();
    case "stripe":
      return new StripePaymentProvider();
  }
}

export class PaymentOrchestratorService {
  static async createSession(
    organizationId: string,
    initiatedByUserId: string,
    data: CreatePaymentSessionDto
  ): Promise<CreatePaymentSessionResult> {
    const amountMinor = resolveAmountMinor(data);
    const providerPrimary: PaymentProvider = "flutterwave";
    const session = await prisma.paymentSession.create({
      data: {
        organizationId,
        initiatedByUserId,
        kind: data.kind,
        providerPrimary,
        currency: data.currency,
        amountMinor,
        planCode: data.planCode ?? null,
        creditsQuantity: data.creditsQuantity ?? null,
        metadata: (data.metadata ?? null) as any,
      },
    });

    const providerOrder: PaymentProvider[] = ["flutterwave", "stripe"];
    let lastError: Error | null = null;

    for (const providerName of providerOrder) {
      const provider = createProvider(providerName);
      try {
        const providerInput: CreateProviderCheckoutSessionInput = {
          paymentSessionId: session.id,
          organizationId,
          currency: data.currency,
          amountMinor,
          description: resolveDescription(data),
          returnUrl: getReturnUrl(),
          metadata: {
            kind: data.kind,
            planCode: data.planCode ?? null,
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
          provider: result.provider,
          status: "providerRedirected",
          checkoutUrl: result.checkoutUrl ?? null,
        };
      } catch (error) {
        lastError = error as Error;
      }
    }

    await prisma.paymentSession.update({
      where: { id: session.id },
      data: {
        status: "failed",
        failedAt: new Date(),
      },
    });

    throw lastError ?? new Error("Unable to create payment session");
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

    await prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: parsed.normalizedTransactionStatus,
          providerTransactionId:
            parsed.providerTransactionId ?? transaction.providerTransactionId,
          providerEventId: parsed.providerEventId ?? null,
          rawStatus: parsed.rawStatus ?? null,
          rawPayload: parsed.rawPayload as any,
          confirmedAt:
            parsed.normalizedTransactionStatus === "succeeded"
              ? new Date()
              : transaction.confirmedAt,
          failedAt:
            parsed.normalizedTransactionStatus === "failed"
              ? new Date()
              : transaction.failedAt,
          cancelledAt:
            parsed.normalizedTransactionStatus === "cancelled"
              ? new Date()
              : transaction.cancelledAt,
          refundedAt:
            parsed.normalizedTransactionStatus === "refunded"
              ? new Date()
              : transaction.refundedAt,
        },
      });

      await tx.paymentSession.update({
        where: { id: transaction.paymentSessionId },
        data: {
          status: parsed.normalizedSessionStatus,
          providerSelected: providerName,
          failedAt:
            parsed.normalizedSessionStatus === "failed"
              ? new Date()
              : transaction.paymentSession.failedAt,
          cancelledAt:
            parsed.normalizedSessionStatus === "cancelled"
              ? new Date()
              : transaction.paymentSession.cancelledAt,
          expiredAt:
            parsed.normalizedSessionStatus === "expired"
              ? new Date()
              : transaction.paymentSession.expiredAt,
        },
      });

      await tx.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });
    });

    if (parsed.normalizedSessionStatus === "succeeded") {
      await PaymentFulfillmentService.fulfill({
        paymentSessionId: transaction.paymentSessionId,
        organizationId: transaction.organizationId,
        kind: transaction.paymentSession.kind as PaymentKind,
        planCode: transaction.paymentSession.planCode,
        creditsQuantity: transaction.paymentSession.creditsQuantity,
      });
    }
  }
}
