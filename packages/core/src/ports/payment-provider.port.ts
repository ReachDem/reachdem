import type { PaymentProvider } from "@reachdem/shared";

export type NormalizedPaymentSessionStatus =
  | "pending"
  | "providerRedirected"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "expired";

export type NormalizedPaymentTransactionStatus =
  | "initiated"
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "refunded";

export interface CreateProviderCheckoutSessionInput {
  paymentSessionId: string;
  organizationId: string;
  currency: string;
  amountMinor: number;
  description: string;
  returnUrl: string;
  customerEmail?: string | null;
  /** Flutterwave payment plan ID for recurring subscriptions. When set, the hosted checkout will link the charge to this plan and restrict payment options to card. */
  paymentPlanId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CreateProviderCheckoutSessionResult {
  provider: PaymentProvider;
  providerSessionId?: string | null;
  providerReference?: string | null;
  checkoutUrl?: string | null;
  rawPayload?: Record<string, unknown> | null;
}

export interface ParsedPaymentWebhookEvent {
  providerEventId?: string | null;
  providerReference?: string | null;
  providerTransactionId?: string | null;
  rawStatus?: string | null;
  normalizedTransactionStatus: NormalizedPaymentTransactionStatus;
  normalizedSessionStatus: NormalizedPaymentSessionStatus;
  rawPayload: Record<string, unknown>;
}

export interface VerifyProviderTransactionInput {
  providerReference?: string | null;
  providerTransactionId?: string | null;
  expectedAmountMinor: number;
  expectedCurrency: string;
}

export interface VerifyProviderTransactionResult {
  verified: boolean;
  providerReference?: string | null;
  providerTransactionId?: string | null;
  rawStatus?: string | null;
  rawPayload: Record<string, unknown>;
}

export interface PaymentProviderPort {
  readonly providerName: PaymentProvider;
  createCheckoutSession(
    input: CreateProviderCheckoutSessionInput
  ): Promise<CreateProviderCheckoutSessionResult>;
  verifyWebhookSignature(rawBody: string, headers: Headers): Promise<boolean>;
  parseWebhookEvent(
    rawBody: string,
    headers: Headers
  ): Promise<ParsedPaymentWebhookEvent>;
  verifyTransaction?(
    input: VerifyProviderTransactionInput
  ): Promise<VerifyProviderTransactionResult>;
}
