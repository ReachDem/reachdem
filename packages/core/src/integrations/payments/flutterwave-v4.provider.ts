import { createHmac, timingSafeEqual, randomUUID } from "crypto";
import { PaymentConfigurationError } from "../../errors/payment.errors";

const TOKEN_URL =
  "https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token";
const DEFAULT_V4_URL = "https://api.flutterwave.com/v4";

function getBaseUrl(): string {
  return process.env.FLUTTERWAVE_V4_BASE_URL?.trim() || DEFAULT_V4_URL;
}

let cachedToken: { access_token: string; expires_at: number } | null = null;

export async function getFlutterwaveV4AccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at) {
    return cachedToken.access_token;
  }

  const clientId = process.env.FLUTTERWAVE_V4_CLIENT_ID?.trim();
  const clientSecret = process.env.FLUTTERWAVE_V4_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new PaymentConfigurationError(
      "Flutterwave v4 payments require FLUTTERWAVE_V4_CLIENT_ID and FLUTTERWAVE_V4_CLIENT_SECRET."
    );
  }

  const res = await fetch(TOKEN_URL, {
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

export type PaymentType = "card" | "opay" | "mobile_money" | "ussd";

export interface ChargeRequestBody {
  type: PaymentType;
  amount: number;
  currency: string;
  customerName: { first: string; last: string };
  email: string;
  phone: { countryCode: string; number: string };
  mobileMoneyNetwork?: string;
  accountBank?: string;
  returnUrl: string;
  reference: string;
}

function normalizePhone(input: ChargeRequestBody["phone"]): {
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

export class FlutterwaveV4PaymentProvider {
  async initiateDirectCharge(body: ChargeRequestBody) {
    const token = await getFlutterwaveV4AccessToken();
    const reference = body.reference;
    const normalizedPhone = normalizePhone(body.phone);

    if (body.type === "opay" && body.currency.toUpperCase() !== "NGN") {
      throw new Error("OPay is only available for NGN transactions.");
    }

    const basePayload = {
      amount: body.amount,
      currency: body.currency,
      reference,
      redirect_url: body.returnUrl,
      customer: {
        email: body.email,
        name: { first: body.customerName.first, last: body.customerName.last },
        phone: {
          country_code: normalizedPhone.countryCode,
          number: normalizedPhone.number,
        },
      },
    };

    let paymentMethodConfig: Record<string, any> = {};

    switch (body.type) {
      case "card":
        paymentMethodConfig = { type: "card" };
        break;
      case "opay":
        paymentMethodConfig = { type: "opay" };
        break;
      case "mobile_money":
        paymentMethodConfig = {
          type: "mobile_money",
          mobile_money: {
            country_code: normalizedPhone.countryCode,
            network: body.mobileMoneyNetwork ?? "MTN",
            phone_number: normalizedPhone.number,
          },
        };
        break;
      case "ussd":
        paymentMethodConfig = {
          type: "ussd",
          ussd: {
            account_bank: body.accountBank ?? "044", // e.g. 044 for Access
          },
        };
        break;
    }

    const payload = {
      ...basePayload,
      payment_method: paymentMethodConfig,
    };

    const response = await fetch(
      `${getBaseUrl().replace(/\/+$/, "")}/orchestration/direct-charges`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Trace-Id": randomUUID(),
          "X-Idempotency-Key": reference,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Flutterwave v4 Direct Charge API failed: ${response.status} - ${errorText}`
      );
    }

    return await response.json();
  }

  async verifyTransaction(chargeId: string) {
    const token = await getFlutterwaveV4AccessToken();

    const response = await fetch(
      `${getBaseUrl().replace(/\/+$/, "")}/charges/${chargeId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Flutterwave v4 verify failed: ${response.status}`);
    }

    return await response.json();
  }
}
