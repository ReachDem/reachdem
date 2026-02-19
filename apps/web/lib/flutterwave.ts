const TOKEN_URL = "https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token";

type FlutterwaveTokenResponse = {
  access_token: string;
  expires_in: number;
};

type CheckoutSessionPayload = {
  tx_ref: string;
  productType?: string;
  amount: number;
  currency: string;
  redirect_url: string;
};

type CheckoutSessionResponse = {
  status?: string;
  data?: {
    id?: string;
    reference?: string;
    checkout_url?: string;
    checkout_link?: string;
    link?: string;
    url?: string;
    session_id?: string;
  };
  error?: {
    type?: string;
    code?: string;
    message?: string;
    validation_errors?: unknown[];
  };
  message?: string;
};

type FlutterwaveApiError = {
  status?: string;
  message?: string;
  error?: {
    type?: string;
    code?: string;
    message?: string;
    validation_errors?: unknown[];
  };
};

type CreateCustomerPayload = {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
};

type CreateCustomerResponse = FlutterwaveApiError & {
  data?: {
    id?: string;
    email?: string;
  };
};

type CreatePaymentMethodPayload = {
  customer_id: string;
  phone_number: string;
  network: "mtn" | "orange";
  country_code: string;
};

type CreatePaymentMethodResponse = FlutterwaveApiError & {
  data?: {
    id?: string;
  };
};

type CreateChargePayload = {
  customer_id: string;
  payment_method_id: string;
  amount: number;
  currency: string;
  tx_ref: string;
  reference: string;
  redirect_url: string;
};

type CreateChargeResponse = FlutterwaveApiError & {
  data?: Record<string, unknown>;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

const buildTxRef = (productType = "pay") => {
  const safeType = productType.replace(/[^a-z0-9]/gi, "").slice(0, 6).toLowerCase() || "pay";
  const timePart = Date.now().toString(36);
  const randPart = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `rd-${safeType}-${timePart}-${randPart}`.slice(0, 40);
};

const getEnvValue = (key: string): string | undefined => {
  const value = process.env[key];
  if (!value) {
    return undefined;
  }
  return value.trim();
};

const getRequiredEnvAny = (keys: string[]) => {
  for (const key of keys) {
    const value = getEnvValue(key);
    if (value) {
      return value;
    }
  }
  throw new Error(`Missing required env var. Set one of: ${keys.join(", ")}`);
};

const getBaseUrl = () => {
  return (
    getEnvValue("FLUTTERWAVE_V4_BASE_URL") ||
    getEnvValue("FLW_V4_BASE_URL") ||
    "https://f4bexperience.flutterwave.com"
  );
};

export const getFlutterwaveToken = async (forceRefresh = false): Promise<string> => {
  if (!forceRefresh && cachedToken && Date.now() < cachedToken.expiresAt) {
    console.log("[FLW] Reusing cached access token");
    return cachedToken.value;
  }

  const clientId = getRequiredEnvAny(["FLUTTERWAVE_V4_CLIENT_ID", "FLW_V4_CLIENT_ID"]);
  const clientSecret = getRequiredEnvAny([
    "FLUTTERWAVE_V4_CLIENT_SECRET",
    "FLW_V4_CLIENT_SECRET",
  ]);

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const json = (await response.json()) as FlutterwaveTokenResponse;

  if (!response.ok || !json.access_token) {
    console.error("[FLW] Token request failed", {
      status: response.status,
      body: json,
    });
    throw new Error("Unable to authenticate with Flutterwave v4.");
  }

  const ttl = Math.max((json.expires_in || 300) - 30, 60);
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + ttl * 1000,
  };
  console.log("[FLW] Access token fetched", {
    expiresInSec: json.expires_in,
    cachedForSec: ttl,
    clientIdPrefix: `${clientId.slice(0, 6)}...`,
    baseUrl: getBaseUrl(),
  });

  return json.access_token;
};

export const createFlutterwaveCheckoutSession = async (
  payload: CheckoutSessionPayload
): Promise<{ checkoutUrl?: string; sessionId: string }> => {
  let txRef = payload.tx_ref || buildTxRef(payload.productType);
  let forceRefreshToken = false;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const token = await getFlutterwaveToken(forceRefreshToken);
    console.log("[FLW] Creating checkout session", {
      tx_ref: txRef,
      amount: payload.amount,
      currency: payload.currency,
      attempt,
      forceRefreshToken,
    });

    const response = await fetch(`${getBaseUrl()}/checkout/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        tx_ref: txRef,
        reference: txRef,
        amount: payload.amount,
        currency: payload.currency,
        redirect_url: payload.redirect_url,
        session_duration: 30,
        max_retry_attempt: 3,
      }),
      cache: "no-store",
    });

    const json = (await response.json()) as CheckoutSessionResponse;
    const sessionId = json.data?.id || json.data?.session_id;
    const checkoutUrlFromApi =
      json.data?.checkout_url || json.data?.checkout_link || json.data?.link || json.data?.url;
    if (response.ok && json.status === "success" && sessionId) {
      let checkoutUrl = checkoutUrlFromApi;

      // Some v4 responses only return the session id at creation time.
      if (!checkoutUrl) {
        console.log("[FLW] Checkout URL missing in create response, fetching session details", {
          sessionId,
        });
        const detailsRes = await fetch(`${getBaseUrl()}/checkout/sessions/${sessionId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const detailsJson = (await detailsRes.json()) as CheckoutSessionResponse;
        checkoutUrl =
          detailsJson.data?.checkout_url ||
          detailsJson.data?.checkout_link ||
          detailsJson.data?.link ||
          detailsJson.data?.url;

        console.log("[FLW] Checkout session details fetched", {
          status: detailsRes.status,
          hasCheckoutUrl: Boolean(checkoutUrl),
        });
      }

      console.log("[FLW] Checkout session created", {
        tx_ref: txRef,
        sessionId,
        reference: json.data?.reference,
        checkoutUrlSource: checkoutUrlFromApi ? "api-create" : checkoutUrl ? "api-details" : "none",
      });
      return {
        checkoutUrl,
        sessionId,
      };
    }

    const duplicateRef =
      response.status === 409 && json.error?.type === "CHECKOUT_SESSION_ALREADY_EXISTS";
    const unauthorized = response.status === 401 || json.error?.type === "UNAUTHORIZED";

    console.error("[FLW] Checkout session creation failed", {
      status: response.status,
      body: json,
      tx_ref: txRef,
      duplicateRef,
      unauthorized,
    });

    if (unauthorized && attempt < 2) {
      forceRefreshToken = true;
      console.log("[FLW] Unauthorized response, refreshing token and retrying once");
      continue;
    }

    if (duplicateRef && attempt < 2) {
      txRef = buildTxRef(payload.productType);
      console.log("[FLW] Retrying with a new tx_ref", { tx_ref: txRef });
      continue;
    }

    throw new Error(
      json.error?.message || json.message || "Failed to create checkout session."
    );
  }

  throw new Error("Failed to create checkout session.");
};

const flutterwaveRequest = async <T>(
  path: string,
  init: RequestInit,
  retryOnUnauthorized = true
): Promise<{ response: Response; json: T }> => {
  let forceRefreshToken = false;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const token = await getFlutterwaveToken(forceRefreshToken);
    const response = await fetch(`${getBaseUrl()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
      cache: "no-store",
    });
    const json = (await response.json()) as T;

    if (response.status !== 401 || !retryOnUnauthorized || attempt >= 2) {
      return { response, json };
    }

    console.log("[FLW] Unauthorized on request, refreshing token", { path, attempt });
    forceRefreshToken = true;
  }

  throw new Error("Flutterwave request failed.");
};

export const createFlutterwaveCustomer = async (
  payload: CreateCustomerPayload
): Promise<{ customerId: string }> => {
  console.log("[FLW] Creating customer", {
    email: payload.email,
    phone_number: payload.phone_number,
  });

  const { response, json } = await flutterwaveRequest<CreateCustomerResponse>("/customers", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const customerId = json.data?.id;
  if (!response.ok || !customerId) {
    console.error("[FLW] Customer creation failed", { status: response.status, body: json });
    throw new Error(json.error?.message || json.message || "Failed to create customer.");
  }

  console.log("[FLW] Customer created", { customerId });
  return { customerId };
};

export const createFlutterwaveMobilePaymentMethod = async (
  payload: CreatePaymentMethodPayload
): Promise<{ paymentMethodId: string }> => {
  console.log("[FLW] Creating mobile money payment method", {
    customer_id: payload.customer_id,
    network: payload.network,
    country_code: payload.country_code,
  });

  const { response, json } = await flutterwaveRequest<CreatePaymentMethodResponse>(
    "/payment-methods",
    {
      method: "POST",
      body: JSON.stringify({
        type: "mobile_money",
        customer_id: payload.customer_id,
        mobile_money: {
          phone_number: payload.phone_number,
          network: payload.network,
          country_code: payload.country_code,
        },
      }),
    }
  );

  const paymentMethodId = json.data?.id;
  if (!response.ok || !paymentMethodId) {
    console.error("[FLW] Payment method creation failed", {
      status: response.status,
      body: json,
    });
    throw new Error(json.error?.message || json.message || "Failed to create payment method.");
  }

  console.log("[FLW] Payment method created", { paymentMethodId });
  return { paymentMethodId };
};

export const createFlutterwaveCharge = async (payload: CreateChargePayload) => {
  console.log("[FLW] Creating charge", {
    amount: payload.amount,
    currency: payload.currency,
    tx_ref: payload.tx_ref,
    reference: payload.reference,
  });

  const { response, json } = await flutterwaveRequest<CreateChargeResponse>("/charges", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error("[FLW] Charge creation failed", { status: response.status, body: json });
    throw new Error(json.error?.message || json.message || "Failed to create charge.");
  }

  console.log("[FLW] Charge created", { status: response.status });
  return json;
};
