export function formatPhoneE164(phone: string, defaultCountryCode: string): string | null {
  if (!phone) return null;
  // Remove all non-numeric characters except the leading plus
  let cleaned = phone.replace(/[^\d+]/g, "");

  // If it starts with 00, replace with +
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }

  // If it has no +, assume it's local and prepend the default country code
  // Some numbers might start with 0 (e.g., 077... or 06...). We typically strip the leading 0 if prepending a country code.
  if (!cleaned.startsWith("+")) {
    // Basic heuristics: if it starts with 0 and has > 8 digits, strip the 0
    if (cleaned.startsWith("0") && cleaned.length > 8) {
      cleaned = cleaned.slice(1);
    }
    cleaned = defaultCountryCode + cleaned;
  }

  return cleaned;
}
