import { createHmac, timingSafeEqual } from "crypto";
import type {
  CreateProviderCheckoutSessionInput,
  CreateProviderCheckoutSessionResult,
  ParsedPaymentWebhookEvent,
  PaymentProviderPort,
} from "../../ports/payment-provider.port";
import {
  PaymentConfigurationError,
  PaymentWebhookPayloadError,
  PaymentWebhookSignatureError,
} from "../../errors/payment.errors";

function getSecretKey(): string {
  const value = process.env.STRIPE_SECRET_KEY;
  if (!value) {
    throw new PaymentConfigurationError("Missing STRIPE_SECRET_KEY");
  }
  return value;
}

function getWebhookSecret(): string {
  const value = process.env.STRIPE_WEBHOOK_SECRET;
  if (!value) {
    throw new PaymentConfigurationError("Missing STRIPE_WEBHOOK_SECRET");
  }
  return value;
}

function getWebhookToleranceSeconds(): number {
  const raw = process.env.STRIPE_WEBHOOK_TOLERANCE_SECONDS ?? "300";
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new PaymentConfigurationError(
      "Missing or invalid STRIPE_WEBHOOK_TOLERANCE_SECONDS"
    );
  }
  return value;
}

function formEncode(entries: Record<string, string>): string {
  return new URLSearchParams(entries).toString();
}

export class StripePaymentProvider implements PaymentProviderPort {
  readonly providerName = "stripe" as const;

  async createCheckoutSession(
    input: CreateProviderCheckoutSessionInput
  ): Promise<CreateProviderCheckoutSessionResult> {
    const successUrl = `${input.returnUrl}${input.returnUrl.includes("?") ? "&" : "?"}payment_session_id=${encodeURIComponent(input.paymentSessionId)}&provider=stripe`;
    const cancelUrl = `${input.returnUrl}${input.returnUrl.includes("?") ? "&" : "?"}payment_session_id=${encodeURIComponent(input.paymentSessionId)}&provider=stripe&cancelled=true`;

    const body = formEncode({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      "line_items[0][price_data][currency]": input.currency.toLowerCase(),
      "line_items[0][price_data][product_data][name]": "ReachDem Payment",
      "line_items[0][price_data][product_data][description]": input.description,
      "line_items[0][price_data][unit_amount]": String(input.amountMinor),
      "line_items[0][quantity]": "1",
      ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
      "metadata[paymentSessionId]": input.paymentSessionId,
      "metadata[organizationId]": input.organizationId,
      "payment_intent_data[metadata][paymentSessionId]": input.paymentSessionId,
      "payment_intent_data[metadata][organizationId]": input.organizationId,
    });

    const response = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getSecretKey()}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );

    if (!response.ok) {
      throw new Error(
        `Stripe create checkout failed with HTTP ${response.status}`
      );
    }

    const payload = (await response.json()) as {
      id?: string;
      url?: string;
      payment_intent?: string;
    };

    return {
      provider: this.providerName,
      providerSessionId: payload.id ?? null,
      providerReference: payload.payment_intent ?? payload.id ?? null,
      checkoutUrl: payload.url ?? null,
      rawPayload: (payload ?? null) as Record<string, unknown> | null,
    };
  }

  async verifyWebhookSignature(
    rawBody: string,
    headers: Headers
  ): Promise<boolean> {
    const sigHeader = headers.get("stripe-signature");
    if (!sigHeader) return false;

    const parts = Object.fromEntries(
      sigHeader.split(",").map((entry) => {
        const [key, value] = entry.split("=");
        return [key, value];
      })
    );

    const timestamp = parts.t;
    const signatures = sigHeader
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.startsWith("v1="))
      .map((entry) => entry.slice(3));
    if (!timestamp || signatures.length === 0) return false;

    const tolerance = getWebhookToleranceSeconds();
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - Number(timestamp)) > tolerance) {
      return false;
    }

    const signedPayload = `${timestamp}.${rawBody}`;
    const expected = createHmac("sha256", getWebhookSecret())
      .update(signedPayload)
      .digest("hex");

    return signatures.some((signature) => {
      try {
        return timingSafeEqual(
          Buffer.from(signature, "utf8"),
          Buffer.from(expected, "utf8")
        );
      } catch {
        return false;
      }
    });
  }

  async parseWebhookEvent(
    rawBody: string,
    headers: Headers
  ): Promise<ParsedPaymentWebhookEvent> {
    const isValid = await this.verifyWebhookSignature(rawBody, headers);
    if (!isValid) {
      throw new PaymentWebhookSignatureError();
    }

    let payload: Record<string, any>;
    try {
      payload = JSON.parse(rawBody) as Record<string, any>;
    } catch {
      throw new PaymentWebhookPayloadError("Invalid JSON in Stripe webhook");
    }
    const eventType = String(payload?.type ?? "");
    const object = payload?.data?.object ?? {};

    let normalizedTransactionStatus:
      | "processing"
      | "succeeded"
      | "failed"
      | "cancelled"
      | "refunded" = "processing";

    switch (eventType) {
      case "checkout.session.completed":
      case "payment_intent.succeeded":
        normalizedTransactionStatus = "succeeded";
        break;
      case "payment_intent.payment_failed":
        normalizedTransactionStatus = "failed";
        break;
      case "checkout.session.expired":
        normalizedTransactionStatus = "cancelled";
        break;
      case "charge.refunded":
        normalizedTransactionStatus = "refunded";
        break;
      default:
        normalizedTransactionStatus = "processing";
    }

    const normalizedSessionStatus =
      normalizedTransactionStatus === "succeeded"
        ? "succeeded"
        : normalizedTransactionStatus === "failed"
          ? "failed"
          : normalizedTransactionStatus === "cancelled"
            ? "cancelled"
            : "processing";

    return {
      providerEventId: payload?.id ?? null,
      providerReference:
        object?.payment_intent ??
        object?.id ??
        object?.metadata?.paymentSessionId ??
        null,
      providerTransactionId: object?.payment_intent ?? object?.id ?? null,
      rawStatus: eventType || null,
      normalizedTransactionStatus,
      normalizedSessionStatus,
      rawPayload: payload,
    };
  }
}
