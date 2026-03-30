import type { Env } from "./types";

const DIRECT_MAIL_API_VERSION = "2015-11-23";

const DIRECT_MAIL_ENDPOINTS: Record<string, string> = {
  "cn-hangzhou": "https://dm.aliyuncs.com/",
  "ap-southeast-1": "https://dm.ap-southeast-1.aliyuncs.com/",
  "ap-southeast-2": "https://dm.ap-southeast-2.aliyuncs.com/",
  "us-east-1": "https://dm.us-east-1.aliyuncs.com/",
  "eu-central-1": "https://dm.eu-central-1.aliyuncs.com/",
};

function percentEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/\+/g, "%20")
    .replace(/\*/g, "%2A")
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/%7E/g, "~");
}

function toIsoTimestamp(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function resolveRegion(env: Env): string {
  return env.ALIBABA_REGION?.trim() || "eu-central-1";
}

function resolveEndpoint(region: string): string {
  return DIRECT_MAIL_ENDPOINTS[region] ?? `https://dm.${region}.aliyuncs.com/`;
}

async function signString(
  stringToSign: string,
  secret: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`${secret}&`),
    {
      name: "HMAC",
      hash: "SHA-1",
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(stringToSign)
  );

  const bytes = new Uint8Array(signature);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function buildSignedQuery(
  params: Record<string, string>,
  accessKeySecret: string,
  httpMethod: "GET" | "POST"
): Promise<string> {
  const canonicalized = Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key] ?? "")}`)
    .join("&");

  const stringToSign = `${httpMethod}&${percentEncode("/")}&${percentEncode(canonicalized)}`;

  return signString(stringToSign, accessKeySecret).then(
    (signature) => `${canonicalized}&Signature=${percentEncode(signature)}`
  );
}

export interface AlibabaSendEmailInput {
  to: string;
  subject: string;
  html: string;
  fromName: string;
}

export interface AlibabaSendEmailResult {
  providerName: string;
  providerMessageId: string | null;
  requestId: string | null;
  httpStatus: number;
  responseMeta: Record<string, unknown> | null;
}

export class AlibabaDirectMailError extends Error {
  httpStatus: number;
  providerCode: string | null;
  providerMessage: string | null;
  requestId: string | null;
  responseMeta: Record<string, unknown> | null;

  constructor(input: {
    message: string;
    httpStatus: number;
    providerCode?: string | null;
    providerMessage?: string | null;
    requestId?: string | null;
    responseMeta?: Record<string, unknown> | null;
  }) {
    super(input.message);
    this.name = "AlibabaDirectMailError";
    this.httpStatus = input.httpStatus;
    this.providerCode = input.providerCode ?? null;
    this.providerMessage = input.providerMessage ?? null;
    this.requestId = input.requestId ?? null;
    this.responseMeta = input.responseMeta ?? null;
  }
}

function buildResponseMeta(
  payload: Record<string, unknown> | null,
  rawText: string
): Record<string, unknown> | null {
  if (payload) {
    return {
      code: payload.Code ?? null,
      message: payload.Message ?? null,
      requestId: payload.RequestId ?? null,
      envId: payload.EnvId ?? null,
    };
  }

  const trimmed = rawText.trim();
  if (!trimmed) {
    return null;
  }

  return {
    rawTextPreview: trimmed.slice(0, 500),
  };
}

export async function sendAlibabaDirectMail(
  input: AlibabaSendEmailInput,
  env: Env
): Promise<AlibabaSendEmailResult> {
  const accessKeyId = env.ALIBABA_ACCESS_KEY_ID?.trim();
  const accessKeySecret = env.ALIBABA_ACCESS_KEY_SECRET?.trim();

  if (!accessKeyId || !accessKeySecret) {
    throw new Error(
      "Alibaba Direct Mail credentials are missing. Configure ALIBABA_ACCESS_KEY_ID and ALIBABA_ACCESS_KEY_SECRET."
    );
  }

  const region = resolveRegion(env);
  const endpoint = resolveEndpoint(region);
  const accountName =
    env.ALIBABA_SENDER_EMAIL?.trim() ||
    env.SENDER_EMAIL?.trim() ||
    env.SMTP_USER?.trim();
  const fromAlias =
    env.ALIBABA_SENDER_NAME?.trim() ||
    env.SENDER_NAME?.trim() ||
    input.fromName;

  if (!accountName) {
    throw new Error(
      "Alibaba Direct Mail sender is missing. Configure ALIBABA_SENDER_EMAIL or SENDER_EMAIL."
    );
  }

  const params: Record<string, string> = {
    Action: "SingleSendMail",
    Format: "JSON",
    Version: DIRECT_MAIL_API_VERSION,
    AccessKeyId: accessKeyId,
    SignatureMethod: "HMAC-SHA1",
    Timestamp: toIsoTimestamp(new Date()),
    SignatureVersion: "1.0",
    SignatureNonce: crypto.randomUUID(),
    RegionId: region,
    AccountName: accountName,
    AddressType: "1",
    ReplyToAddress: "false",
    ToAddress: input.to,
    Subject: input.subject,
    HtmlBody: input.html,
    FromAlias: fromAlias,
    ClickTrace: "0",
  };

  const signedQuery = await buildSignedQuery(params, accessKeySecret, "POST");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: signedQuery,
  });

  const rawText = await response.text();
  let payload: Record<string, unknown> | null = null;

  try {
    payload = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : null;
  } catch {
    payload = null;
  }

  const responseMeta = buildResponseMeta(payload, rawText);
  const providerCode = typeof payload?.Code === "string" ? payload.Code : null;
  const providerMessage =
    typeof payload?.Message === "string" ? payload.Message : null;
  const requestId =
    typeof payload?.RequestId === "string" ? payload.RequestId : null;

  if (!response.ok) {
    throw new AlibabaDirectMailError({
      message: `Alibaba Direct Mail API failed (HTTP ${response.status}): ${providerMessage || rawText || `HTTP ${response.status}`}`,
      httpStatus: response.status,
      providerCode,
      providerMessage,
      requestId,
      responseMeta,
    });
  }

  if (payload?.Code) {
    throw new AlibabaDirectMailError({
      message: `Alibaba Direct Mail rejected request: ${String(payload.Code)}${payload.Message ? ` - ${String(payload.Message)}` : ""}`,
      httpStatus: response.status,
      providerCode,
      providerMessage,
      requestId,
      responseMeta,
    });
  }

  return {
    providerName: "alibaba-direct-mail",
    providerMessageId:
      (payload?.EnvId as string | undefined) ??
      (payload?.RequestId as string | undefined) ??
      null,
    requestId,
    httpStatus: response.status,
    responseMeta,
  };
}
