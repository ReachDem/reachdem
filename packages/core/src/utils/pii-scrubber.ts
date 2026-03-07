import { createHash } from "crypto";

/**
 * Hashes a sensitive string (phone, email) with SHA-256.
 * This allows correlation without storing PII.
 */
export function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16); // 16 chars is enough for correlation
}

/**
 * Masks provider account IDs in endpoint URLs.
 * e.g. /2010-04-01/Accounts/ACxxxx/Messages → /2010-04-01/Accounts/***\/Messages
 */
export function maskEndpoint(endpoint: string): string {
  // Mask patterns like /Accounts/AC[alphanum]/, /v1/accounts/[id]/, etc.
  return endpoint
    .replace(/\/[A-Z]{2}[a-zA-Z0-9]{20,34}\//g, "/***/")
    .replace(/\/accounts\/[a-zA-Z0-9_-]{8,}\//gi, "/accounts/***/")
    .replace(/\/api-key\/[a-zA-Z0-9_-]{8,}/gi, "/api-key/***");
}

/**
 * Removes known PII fields from request/response payloads.
 * Returns a safe, redacted object suitable for storage in JSONB.
 */
const PII_FIELDS = [
  "to",
  "from",
  "body",
  "text",
  "message",
  "phone",
  "email",
  "address",
  "content",
  "recipients",
];

export function redactMeta(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (PII_FIELDS.some((pii) => key.toLowerCase().includes(pii))) {
      if (typeof value === "string") {
        // Keep metadata: length of the original string, hash for correlation
        result[key] = `[REDACTED:len=${value.length}]`;
      } else if (Array.isArray(value)) {
        result[key] = `[REDACTED_ARRAY:count=${value.length}]`;
      } else {
        result[key] = "[REDACTED]";
      }
    } else if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      result[key] = redactMeta(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Truncates a string to a safe maximum length for error messages.
 */
export function truncate(value: string, max = 500): string {
  if (value.length <= max) return value;
  return value.slice(0, max) + "…";
}
