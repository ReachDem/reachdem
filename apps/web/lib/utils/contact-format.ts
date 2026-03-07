/**
 * Standardizes an email address.
 * Converts to lowercase and removes leading/trailing whitespace.
 */
export function standardizeEmail(
  email: string | null | undefined
): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  // Basic validation just to avoid empty strings passing through
  return trimmed.includes("@") ? trimmed : null;
}

/**
 * Standardizes a phone number to E.164 format.
 * Lightweight implementation without heavy external libraries.
 */
export function standardizePhoneNumber(
  phone: string | null | undefined,
  defaultCountryCode?: string
): string | null {
  if (!phone) return null;

  // Strip everything except digits and the plus sign
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return null;

  // If it already has a '+' sign at the beginning, assume it's E.164 or at least has country code
  if (cleaned.startsWith("+")) {
    // Basic validation: must have at least 7 digits after the plus
    if (cleaned.length > 7) {
      return cleaned;
    }
    return null; // Too short to be valid
  }

  // If there's no '+', we just prepend the default country code
  // We assume defaultCountryCode already contains the '+' (e.g., '+237')
  if (defaultCountryCode) {
    const code = defaultCountryCode.startsWith("+")
      ? defaultCountryCode
      : `+${defaultCountryCode}`;
    // Some local numbers might start with 0, so optionally strip leading 0s if appending country code
    // Although in some countries a leading 0 is kept, standard E.164 drops it.
    // We'll do a primitive drop of leading zero.
    if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }
    return `${code}${cleaned}`;
  }

  // If all else fails and no default country code is provided, just return the cleaned digits.
  // Note: it's not strictly E.164 without the +, but it's sanitized.
  return cleaned;
}
