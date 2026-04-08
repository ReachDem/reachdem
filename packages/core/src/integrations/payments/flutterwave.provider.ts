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
  const configured = process.env.FLUTTERWAVE_V4_BASE_URL?.trim();
  if (!configured) {
    return "https://api.flutterwave.com/v3";
  }

  if (/f4bexperience\.flutterwave\.com/i.test(configured)) {
    return "https://api.flutterwave.com/v3";
  }

  if (/\/v\d+$/i.test(configured)) {
    return configured;
  }

  if (/flutterwave\.com/i.test(configured)) {
    return `${configured.replace(/\/+$/, "")}/v3`;
  }

  return configured;
}

function getSecretKey(): string {
  const value = process.env.FLUTTERWAVE_SECRET_KEY?.trim();
  if (value) {
    return value;
  }

  if (process.env.FLUTTERWAVE_V4_CLIENT_SECRET?.trim()) {
    throw new PaymentConfigurationError(
      "Flutterwave v3 payments require FLUTTERWAVE_SECRET_KEY. FLUTTERWAVE_V4_CLIENT_SECRET is an OAuth client secret and cannot be used as a v3 Bearer key."
    );
  }

  if (!value) {
    throw new PaymentConfigurationError("Missing FLUTTERWAVE_SECRET_KEY");
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

function getPaymentOptions(): string | undefined {
  const value = process.env.FLUTTERWAVE_PAYMENT_OPTIONS?.trim();
  if (!value) {
    return undefined;
  }

  const normalized = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join(",");

  return normalized || undefined;
}

export class FlutterwavePaymentProvider implements PaymentProviderPort {
  readonly providerName = "flutterwave" as const;

  private buildReturnUrl(baseUrl: string, paymentSessionId: string): string {
    const url = new URL(baseUrl);
    url.searchParams.set("payment_session_id", paymentSessionId);
    url.searchParams.set("provider", this.providerName);
    return url.toString();
  }

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
    const paymentOptions = getPaymentOptions();
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
          redirect_url: this.buildReturnUrl(
            input.returnUrl,
            input.paymentSessionId
          ),
          customer: {
            email: input.customerEmail ?? "payments@reachdem.local",
          },
          customizations: {
            title: "ReachDem Payment",
            description: input.description,
          },
          ...(paymentOptions ? { payment_options: paymentOptions } : {}),
          configurations: {
            session_duration: Number(
              process.env.PAYMENT_SESSION_DURATION_MINUTES ?? "30"
            ),
            max_retry_attempt: Number(
              process.env.PAYMENT_MAX_RETRY_ATTEMPTS ?? "5"
            ),
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
      const errorText = await response.text().catch(() => "");
      const details = errorText.trim() ? ` - ${errorText.trim()}` : "";
      throw new Error(
        `Flutterwave create payment failed with HTTP ${response.status}${details}`
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

    const provided = signature.trim();
    const expected = createHmac("sha256", secret)
      .update(rawBody)
      .digest("base64");

    try {
      return timingSafeEqual(
        textEncoder.encode(provided),
        textEncoder.encode(expected)
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
      `${getBaseUrl().replace(/\/+$/, "")}/transactions/${encodeURIComponent(transactionId)}/verify`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getSecretKey()}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      const details = errorText.trim() ? ` - ${errorText.trim()}` : "";
      throw new PaymentVerificationError(
        `Flutterwave verify payment failed with HTTP ${response.status}${details}`
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
      amountMinor >= input.expectedAmountMinor &&
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
const textEncoder = new TextEncoder();
