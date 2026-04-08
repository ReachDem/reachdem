import type { PaymentMethodType, PaymentProvider } from "@reachdem/shared";

export interface InitiateDirectChargeInput {
  type: PaymentMethodType;
  amountMinor: number;
  currency: string;
  customerName: { first: string; last: string };
  email: string;
  phone: { countryCode: string; number: string };
  address?: {
    city: string;
    country: string;
    line1: string;
    line2?: string;
    postalCode: string;
    state: string;
  };
  mobileMoneyNetwork?: string;
  accountBank?: string;
  returnUrl: string;
  reference: string;
  card?: {
    number: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    saveCard?: boolean;
  };
}

export interface InitiateDirectChargeResult {
  data?: Record<string, unknown> | null;
}

export interface VerifyDirectChargeInput {
  chargeId: string;
}

export interface VerifyDirectChargeResult {
  data?: Record<string, unknown> | null;
}

export interface AuthorizeDirectChargeInput {
  chargeId: string;
  authorization:
    | {
        type: "avs";
        address: {
          city: string;
          country: string;
          line1: string;
          line2?: string;
          postalCode: string;
          state: string;
        };
      }
    | {
        type: "pin";
        pin: string;
      }
    | {
        type: "otp";
        otp: string;
      };
}

export interface AuthorizeDirectChargeResult {
  data?: Record<string, unknown> | null;
}

export interface DirectChargeProviderPort {
  readonly providerName: PaymentProvider;
  initiateDirectCharge(
    input: InitiateDirectChargeInput
  ): Promise<InitiateDirectChargeResult>;
  authorizeDirectCharge(
    input: AuthorizeDirectChargeInput
  ): Promise<AuthorizeDirectChargeResult>;
  verifyDirectCharge(
    input: VerifyDirectChargeInput
  ): Promise<VerifyDirectChargeResult>;
}
