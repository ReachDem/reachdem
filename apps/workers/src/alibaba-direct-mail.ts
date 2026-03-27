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
  accessKeySecret: string
): Promise<string> {
  const canonicalized = Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key] ?? "")}`)
    .join("&");

  const stringToSign = `GET&${percentEncode("/")}&${percentEncode(canonicalized)}`;

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

  const signedQuery = await buildSignedQuery(params, accessKeySecret);

  const response = await fetch(`${endpoint}?${signedQuery}`, {
    method: "GET",
  });

  const rawText = await response.text();
  let payload: Record<string, unknown> | null = null;

  try {
    payload = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      (payload?.Message as string | undefined) ||
      rawText ||
      `HTTP ${response.status}`;
    throw new Error(
      `Alibaba Direct Mail API failed (HTTP ${response.status}): ${message}`
    );
  }

  if (payload?.Code) {
    throw new Error(
      `Alibaba Direct Mail rejected request: ${String(payload.Code)}${payload.Message ? ` - ${String(payload.Message)}` : ""}`
    );
  }

  return {
    providerName: "alibaba-direct-mail",
    providerMessageId:
      (payload?.EnvId as string | undefined) ??
      (payload?.RequestId as string | undefined) ??
      null,
  };
}
