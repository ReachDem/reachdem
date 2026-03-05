// ─── SMS Error Classifier ─────────────────────────────────────────────────────
// Determines whether a provider error is retryable (trigger fallback) or final.

/** Errors that are always final — fallback makes no sense */
const FINAL_ERROR_CODES = new Set([
  // Generic
  "invalid_number",
  "number_blacklisted",
  "opt_out",
  "unsubscribed",
  "do_not_contact",
  // Twilio
  "21211", // Invalid 'To' Phone Number
  "21614", // 'To' number is not a valid mobile number
  "21610", // Message blocked — recipient opted out
  "21217", // Phone Number unsupported
  "30034", // Message blocked
  // Infobip
  "EC_0002", // Recipient not found / invalid
  "EC_0004", // Number on blocklist
]);

/**
 * Returns "retryable" for network/5xx/rate-limit errors.
 * Returns "final" for invalid number, opt-out, policy violations.
 */
export function classifyError(errorCode: string): "retryable" | "final" {
  // Check Set first without lowercasing (Infobip codes are uppercase: EC_0002)
  if (FINAL_ERROR_CODES.has(errorCode)) return "final";

  const code = errorCode.toLowerCase().trim();
  // Also check lowercase version for generic semantic codes
  if (FINAL_ERROR_CODES.has(code)) return "final";
  if (code.startsWith("rate")) return "retryable";
  if (code.startsWith("timeout")) return "retryable";
  if (code.startsWith("network")) return "retryable";
  return "retryable"; // Default: assume retryable for unknown codes
}
