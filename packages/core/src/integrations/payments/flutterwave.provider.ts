import { createHmac, timingSafeEqual } from "crypto";
import type {
  CreateProviderCheckoutSessionInput,
  CreateProviderCheckoutSessionResult,
  ParsedPaymentWebhookEvent,
  PaymentProviderPort,
  VerifyProviderTransactionInput,
  VerifyProviderTransactionResult,
} from "../../ports/payment-provider.port";
import {
  PaymentConfigurationError,
  PaymentWebhookPayloadError,
  PaymentVerificationError,
} from "../../errors/payment.errors";

const ZERO_DECIMAL_CURRENCIES = new Set(["XAF", "XOF", "JPY", "KRW"]);

function getBaseUrl(): string {
  return (
    process.env.FLUTTERWAVE_V4_BASE_URL ?? "https://api.flutterwave.com/v3"
  );
}

function getSecretKey(): string {
  const value =
    process.env.FLUTTERWAVE_SECRET_KEY ??
    process.env.FLUTTERWAVE_V4_CLIENT_SECRET;
  if (!value) {
    throw new PaymentConfigurationError(
      "Missing FLUTTERWAVE_SECRET_KEY / FLUTTERWAVE_V4_CLIENT_SECRET"
    );
  }
  return value;
}

function getWebhookSecret(): string {
  const value = process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH;
  if (!value) {
    throw new PaymentConfigurationError(
      "Missing FLUTTERWAVE_WEBHOOK_SECRET_HASH"
    );
  }
  return value;
}

export class FlutterwavePaymentProvider implements PaymentProviderPort {
  readonly providerName = "flutterwave" as const;

  private toProviderAmount(currency: string, amountMinor: number): number {
    return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())
      ? amountMinor
      : amountMinor / 100;
  }

  private fromProviderAmount(currency: string, amount: number): number {
    return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())
      ? Math.round(amount)
      : Math.round(amount * 100);
  }

  async createCheckoutSession(
    input: CreateProviderCheckoutSessionInput
  ): Promise<CreateProviderCheckoutSessionResult> {
    const txRef = `pay_${input.paymentSessionId}`;
    const response = await fetch(
      `${getBaseUrl().replace(/\/+$/, "")}/payments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getSecretKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tx_ref: txRef,
          amount: this.toProviderAmount(input.currency, input.amountMinor),
          currency: input.currency,
          redirect_url: input.returnUrl,
          customer: {
            email: input.customerEmail ?? "payments@reachdem.local",
          },
          customizations: {
            title: "ReachDem Payment",
            description: input.description,
          },
          meta: {
            paymentSessionId: input.paymentSessionId,
            organizationId: input.organizationId,
            ...(input.metadata ?? {}),
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Flutterwave create payment failed with HTTP ${response.status}`
      );
    }

    const payload = (await response.json()) as {
      data?: {
        id?: string | number;
        tx_ref?: string;
        link?: string;
      };
    };

    return {
      provider: this.providerName,
      providerSessionId:
        payload.data?.id !== undefined ? String(payload.data.id) : null,
      providerReference: payload.data?.tx_ref ?? txRef,
      checkoutUrl: payload.data?.link ?? null,
      rawPayload: (payload ?? null) as Record<string, unknown> | null,
    };
  }

  async verifyWebhookSignature(
    rawBody: string,
    headers: Headers
  ): Promise<boolean> {
    const legacyHash = headers.get("verif-hash");
    const secret = getWebhookSecret();
    if (legacyHash && legacyHash === secret) {
      return true;
    }

    const signature = headers.get("flutterwave-signature");
    if (!signature) {
      return false;
    }

    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const provided = signature.trim().toLowerCase();
    const normalizedExpected = expected.toLowerCase();

    try {
      return timingSafeEqual(
        Buffer.from(provided, "utf8"),
        Buffer.from(normalizedExpected, "utf8")
      );
    } catch {
      return false;
    }
  }

  async parseWebhookEvent(
    rawBody: string,
    headers: Headers
  ): Promise<ParsedPaymentWebhookEvent> {
    void headers;
    let payload: Record<string, any>;
    try {
      payload = JSON.parse(rawBody) as Record<string, any>;
    } catch {
      throw new PaymentWebhookPayloadError(
        "Invalid JSON in Flutterwave webhook"
      );
    }
    const status = String(
      payload?.status ?? payload?.data?.status ?? ""
    ).toLowerCase();

    const normalizedTransactionStatus =
      status === "successful" || status === "completed"
        ? "succeeded"
        : status === "failed"
          ? "failed"
          : status === "cancelled"
            ? "cancelled"
            : "processing";

    const normalizedSessionStatus =
      normalizedTransactionStatus === "succeeded"
        ? "succeeded"
        : normalizedTransactionStatus === "failed"
          ? "failed"
          : normalizedTransactionStatus === "cancelled"
            ? "cancelled"
            : "processing";

    return {
      providerEventId:
        payload?.id !== undefined
          ? String(payload.id)
          : payload?.data?.id !== undefined
            ? String(payload.data.id)
            : null,
      providerReference:
        payload?.tx_ref ??
        payload?.data?.tx_ref ??
        payload?.data?.reference ??
        null,
      providerTransactionId:
        payload?.data?.id !== undefined ? String(payload.data.id) : null,
      rawStatus: status || null,
      normalizedTransactionStatus,
      normalizedSessionStatus,
      rawPayload: payload,
    };
  }

  async verifyTransaction(
    input: VerifyProviderTransactionInput
  ): Promise<VerifyProviderTransactionResult> {
    const transactionId = input.providerTransactionId;
    if (!transactionId) {
      throw new PaymentVerificationError(
        "Missing Flutterwave providerTransactionId for verification"
      );
    }

    const response = await fetch(
      `${getBaseUrl().replace(/\/+$/, "")}/charges/${encodeURIComponent(transactionId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getSecretKey()}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new PaymentVerificationError(
        `Flutterwave verify payment failed with HTTP ${response.status}`
      );
    }

    const payload = (await response.json()) as {
      data?: {
        id?: string | number;
        tx_ref?: string;
        reference?: string;
        status?: string;
        amount?: number;
        currency?: string;
      };
    };

    const amount = Number(payload.data?.amount);
    const currency = String(payload.data?.currency ?? "").toUpperCase();
    const reference =
      payload.data?.tx_ref ??
      payload.data?.reference ??
      input.providerReference ??
      null;
    const status = String(payload.data?.status ?? "").toLowerCase();

    const amountMinor = Number.isFinite(amount)
      ? this.fromProviderAmount(currency, amount)
      : NaN;
    const verified =
      (status === "successful" ||
        status === "completed" ||
        status === "succeeded") &&
      currency === input.expectedCurrency.toUpperCase() &&
      amountMinor === input.expectedAmountMinor &&
      Boolean(
        reference &&
        input.providerReference &&
        reference === input.providerReference
      );

    return {
      verified,
      providerReference: reference,
      providerTransactionId:
        payload.data?.id !== undefined
          ? String(payload.data.id)
          : transactionId,
      rawStatus: status || null,
      rawPayload: (payload ?? null) as Record<string, unknown>,
    };
  }
}
