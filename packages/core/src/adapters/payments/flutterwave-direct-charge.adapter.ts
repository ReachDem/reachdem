import { randomUUID } from "crypto";
import type {
  AuthorizeDirectChargeInput,
  AuthorizeDirectChargeResult,
  DirectChargeProviderPort,
  InitiateDirectChargeInput,
  InitiateDirectChargeResult,
  VerifyDirectChargeInput,
  VerifyDirectChargeResult,
} from "../../ports/direct-charge-provider.port";
import { PaymentConfigurationError } from "../../errors/payment.errors";
import {
  createFlutterwaveNonce,
  encryptFlutterwaveField,
} from "../../utils/flutterwave-encryption";

const DEFAULT_TOKEN_URL =
  "https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token";
const DEFAULT_V4_URL = "https://api.flutterwave.com/v4";
const ZERO_DECIMAL_CURRENCIES = new Set(["XAF", "XOF", "JPY", "KRW", "UGX"]);

function getBaseUrl(): string {
  return process.env.FLUTTERWAVE_V4_BASE_URL?.trim() || DEFAULT_V4_URL;
}

function getTokenUrl(): string {
  // Allow explicit override for non-standard environments
  return process.env.FLUTTERWAVE_V4_TOKEN_URL?.trim() || DEFAULT_TOKEN_URL;
}

function buildUrl(path: string): string {
  return `${getBaseUrl().replace(/\/+$/, "")}${path}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function normalizeCardExpiryYear(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 2) {
    return digits;
  }

  if (digits.length === 4) {
    return digits.slice(-2);
  }

  throw new Error("Card expiry year must be provided in YY or YYYY format.");
}

let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getFlutterwaveV4AccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at) {
    return cachedToken.access_token;
  }

  const clientId = process.env.FLUTTERWAVE_V4_CLIENT_ID?.trim().replace(
    /^["']|["']$/g,
    ""
  );
  const clientSecret = process.env.FLUTTERWAVE_V4_CLIENT_SECRET?.trim().replace(
    /^["']|["']$/g,
    ""
  );

  if (!clientId && !clientSecret) {
    throw new PaymentConfigurationError(
      "Flutterwave v4 payments require FLUTTERWAVE_V4_CLIENT_ID and FLUTTERWAVE_V4_CLIENT_SECRET."
    );
  }
  if (!clientId) {
    throw new PaymentConfigurationError(
      "Missing FLUTTERWAVE_V4_CLIENT_ID environment variable."
    );
  }
  if (!clientSecret) {
    throw new PaymentConfigurationError(
      "Missing FLUTTERWAVE_V4_CLIENT_SECRET environment variable."
    );
  }

  const tokenUrl = getTokenUrl();
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to get Flutterwave token: ${await res.text()}`);
  }

  const data = await res.json();
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.access_token;
}

function normalizePhone(input: InitiateDirectChargeInput["phone"]): {
  countryCode: string;
  number: string;
} {
  const countryCode = input.countryCode.replace(/\D/g, "");
  let number = input.number.replace(/\D/g, "");

  if (countryCode && number.startsWith(countryCode)) {
    number = number.slice(countryCode.length);
  }

  if (countryCode === "234" && number.length === 11 && number.startsWith("0")) {
    number = number.slice(1);
  }

  return {
    countryCode,
    number,
  };
}

function normalizeAddress(
  input: NonNullable<InitiateDirectChargeInput["address"]>
) {
  return {
    city: input.city,
    country: input.country,
    line1: input.line1,
    ...(input.line2?.trim() ? { line2: input.line2.trim() } : {}),
    postal_code: input.postalCode,
    state: input.state,
  };
}

function buildFlutterwaveHeaders(args: {
  token: string;
  idempotencyKey?: string;
}) {
  return {
    Authorization: `Bearer ${args.token}`,
    "Content-Type": "application/json",
    "X-Trace-Id": randomUUID(),
    ...(args.idempotencyKey
      ? { "X-Idempotency-Key": args.idempotencyKey }
      : {}),
  };
}

async function parseJsonResponse(
  response: Response,
  context: string
): Promise<Record<string, unknown>> {
  if (!response.ok) {
    throw new Error(
      `${context}: ${response.status} - ${await response.text()}`
    );
  }

  return (await response.json()) as Record<string, unknown>;
}

async function flutterwaveRequest(args: {
  token: string;
  path: string;
  method?: "GET" | "POST" | "PUT";
  body?: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<Record<string, unknown>> {
  const response = await fetch(buildUrl(args.path), {
    method: args.method ?? "GET",
    headers: buildFlutterwaveHeaders(args),
    ...(args.body ? { body: JSON.stringify(args.body) } : {}),
  });

  return parseJsonResponse(
    response,
    `Flutterwave v4 request failed for ${args.method ?? "GET"} ${args.path}`
  );
}

function extractChargeData(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const data = payload.data;

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Flutterwave v4 did not return a valid charge payload.");
  }

  return data as Record<string, unknown>;
}

export class FlutterwaveDirectChargeAdapter implements DirectChargeProviderPort {
  readonly providerName = "flutterwave" as const;

  private toProviderAmount(currency: string, amountMinor: number): number {
    return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())
      ? amountMinor
      : amountMinor / 100;
  }

  private extractCustomerId(payload: Record<string, unknown>): string | null {
    const data = payload.data;

    if (Array.isArray(data)) {
      for (const item of data) {
        const customerId = asString(asRecord(item)?.id);
        if (customerId) {
          return customerId;
        }
      }
    }

    const dataRecord = asRecord(data);
    const directId = asString(dataRecord?.id);
    if (directId) {
      return directId;
    }

    const nestedCollections = [
      dataRecord?.customers,
      dataRecord?.data,
      dataRecord?.items,
      dataRecord?.results,
    ];

    for (const collection of nestedCollections) {
      if (!Array.isArray(collection)) {
        continue;
      }

      for (const item of collection) {
        const customerId = asString(asRecord(item)?.id);
        if (customerId) {
          return customerId;
        }
      }
    }

    return null;
  }

  private async searchCustomerByEmail(
    token: string,
    email: string
  ): Promise<string | null> {
    const payload = await flutterwaveRequest({
      token,
      path: "/customers/search",
      method: "POST",
      body: {
        email,
      },
    }).catch(() => null);

    if (!payload) {
      return null;
    }

    return this.extractCustomerId(payload);
  }

  private async createCustomer(
    token: string,
    input: InitiateDirectChargeInput
  ): Promise<string> {
    if (!input.address) {
      throw new Error("Billing address is required for card payments.");
    }

    const normalizedPhone = normalizePhone(input.phone);
    const existingCustomerId = await this.searchCustomerByEmail(
      token,
      input.email
    );

    if (existingCustomerId) {
      return existingCustomerId;
    }

    const response = await fetch(buildUrl("/customers"), {
      method: "POST",
      headers: buildFlutterwaveHeaders({
        token,
        idempotencyKey: `${input.reference}:customer`,
      }),
      body: JSON.stringify({
        email: input.email,
        name: {
          first: input.customerName.first,
          last: input.customerName.last,
        },
        phone: {
          country_code: normalizedPhone.countryCode,
          number: normalizedPhone.number,
        },
        address: normalizeAddress(input.address),
      }),
    });

    if (response.status === 409) {
      const customerId = await this.searchCustomerByEmail(token, input.email);

      if (customerId) {
        return customerId;
      }
    }

    const payload = await parseJsonResponse(
      response,
      "Flutterwave v4 request failed for POST /customers"
    );
    const customerId = this.extractCustomerId(payload);

    if (!customerId) {
      throw new Error("Flutterwave v4 did not return a customer identifier.");
    }

    return customerId;
  }

  private async createCardPaymentMethod(
    token: string,
    input: InitiateDirectChargeInput
  ): Promise<string> {
    if (!input.card) {
      throw new Error("Card details are required for card payments.");
    }

    const nonce = createFlutterwaveNonce();
    const payload = await flutterwaveRequest({
      token,
      path: "/payment-methods",
      method: "POST",
      idempotencyKey: `${input.reference}:payment-method`,
      body: {
        type: "card",
        card: {
          nonce,
          encrypted_card_number: await encryptFlutterwaveField(
            input.card.number,
            nonce
          ),
          encrypted_expiry_month: await encryptFlutterwaveField(
            input.card.expiryMonth,
            nonce
          ),
          encrypted_expiry_year: await encryptFlutterwaveField(
            normalizeCardExpiryYear(input.card.expiryYear),
            nonce
          ),
          encrypted_cvv: await encryptFlutterwaveField(input.card.cvv, nonce),
        },
      },
    });

    const paymentMethod = payload.data as Record<string, unknown> | undefined;
    const paymentMethodId =
      paymentMethod && typeof paymentMethod.id === "string"
        ? paymentMethod.id
        : null;

    if (!paymentMethodId) {
      throw new Error(
        "Flutterwave v4 did not return a payment method identifier."
      );
    }

    return paymentMethodId;
  }

  private async createCardCharge(args: {
    token: string;
    input: InitiateDirectChargeInput;
    customerId: string;
    paymentMethodId: string;
  }): Promise<Record<string, unknown>> {
    return flutterwaveRequest({
      token: args.token,
      path: "/charges",
      method: "POST",
      idempotencyKey: args.input.reference,
      body: {
        reference: args.input.reference,
        currency: args.input.currency,
        customer_id: args.customerId,
        payment_method_id: args.paymentMethodId,
        redirect_url: args.input.returnUrl,
        amount: this.toProviderAmount(
          args.input.currency,
          args.input.amountMinor
        ),
        meta: {
          save_payment_method: Boolean(args.input.card?.saveCard),
        },
      },
    });
  }

  async initiateDirectCharge(
    input: InitiateDirectChargeInput
  ): Promise<InitiateDirectChargeResult> {
    const token = await getFlutterwaveV4AccessToken();
    const normalizedPhone = normalizePhone(input.phone);

    if (input.type === "opay" && input.currency.toUpperCase() !== "NGN") {
      throw new Error("OPay is only available for NGN transactions.");
    }

    if (input.type === "card") {
      if (!input.address) {
        throw new Error("Billing address is required for card payments.");
      }

      const customerId = await this.createCustomer(token, input);
      const paymentMethodId = await this.createCardPaymentMethod(token, input);
      let chargePayload = await this.createCardCharge({
        token,
        input,
        customerId,
        paymentMethodId,
      });
      let chargeData = extractChargeData(chargePayload);

      if (
        chargeData.next_action &&
        typeof chargeData.next_action === "object" &&
        (chargeData.next_action as Record<string, unknown>).type ===
          "requires_additional_fields"
      ) {
        const authorized = await this.authorizeDirectCharge({
          chargeId: String(chargeData.id),
          authorization: {
            type: "avs",
            address: input.address,
          },
        });

        chargePayload = (authorized.data ?? null) as Record<string, unknown>;
      }

      return {
        data: chargePayload,
      };
    }

    const payload = await flutterwaveRequest({
      token,
      path: "/orchestration/direct-charges",
      method: "POST",
      idempotencyKey: input.reference,
      body: {
        amount: this.toProviderAmount(input.currency, input.amountMinor),
        currency: input.currency,
        reference: input.reference,
        redirect_url: input.returnUrl,
        customer: {
          email: input.email,
          name: {
            first: input.customerName.first,
            last: input.customerName.last,
          },
          phone: {
            country_code: normalizedPhone.countryCode,
            number: normalizedPhone.number,
          },
          ...(input.address
            ? {
                address: normalizeAddress(input.address),
              }
            : {}),
        },
        payment_method:
          input.type === "opay"
            ? { type: "opay" }
            : input.type === "mobile_money"
              ? {
                  type: "mobile_money",
                  mobile_money: {
                    country_code: normalizedPhone.countryCode,
                    network: input.mobileMoneyNetwork ?? "MTN",
                    phone_number: normalizedPhone.number,
                  },
                }
              : {
                  type: "ussd",
                  ussd: {
                    account_bank: input.accountBank ?? "044",
                  },
                },
      },
    });

    return {
      data: payload,
    };
  }

  async authorizeDirectCharge(
    input: AuthorizeDirectChargeInput
  ): Promise<AuthorizeDirectChargeResult> {
    const token = await getFlutterwaveV4AccessToken();

    if (input.authorization.type === "avs") {
      return {
        data: await flutterwaveRequest({
          token,
          path: `/charges/${input.chargeId}`,
          method: "PUT",
          idempotencyKey: `${input.chargeId}:avs`,
          body: {
            authorization: {
              type: "avs",
              avs: {
                address: normalizeAddress(input.authorization.address),
              },
            },
          },
        }),
      };
    }

    if (input.authorization.type === "pin") {
      const nonce = createFlutterwaveNonce();

      return {
        data: await flutterwaveRequest({
          token,
          path: `/charges/${input.chargeId}`,
          method: "PUT",
          idempotencyKey: `${input.chargeId}:pin`,
          body: {
            authorization: {
              type: "pin",
              pin: {
                nonce,
                encrypted_pin: await encryptFlutterwaveField(
                  input.authorization.pin,
                  nonce
                ),
              },
            },
          },
        }),
      };
    }

    return {
      data: await flutterwaveRequest({
        token,
        path: `/charges/${input.chargeId}`,
        method: "PUT",
        idempotencyKey: `${input.chargeId}:otp`,
        body: {
          authorization: {
            type: "otp",
            otp: {
              code: input.authorization.otp,
            },
          },
        },
      }),
    };
  }

  async verifyDirectCharge(
    input: VerifyDirectChargeInput
  ): Promise<VerifyDirectChargeResult> {
    const token = await getFlutterwaveV4AccessToken();

    return {
      data: await flutterwaveRequest({
        token,
        path: `/charges/${input.chargeId}`,
      }),
    };
  }
}
