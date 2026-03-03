import { parsePhoneNumber, CountryCode } from "libphonenumber-js";

/**
 * Attempts to parse and return a phone number in E.164 format.
 * @param phone - Raw phone string from the import
 * @param defaultCountry - ISO 3166-1 alpha-2 country code (e.g. "CM", "SN", "FR")
 */
export function formatPhoneE164(
  phone: string,
  defaultCountry: string
): string | null {
  if (!phone) return null;

  // Normalise 00-prefixed international numbers → +
  const normalised = phone.trim().replace(/^00/, "+");

  try {
    const parsed = parsePhoneNumber(normalised, defaultCountry as CountryCode);
    if (parsed && parsed.isValid()) {
      return parsed.format("E.164");
    }
  } catch {
    // fall through – return null for unparseable numbers
  }

  return null;
}
