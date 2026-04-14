const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const SIMPLE_E164_REGEX = /^\+[1-9]\d{7,14}$/;

function normalizeEmailValue(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizePhoneValue(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function computeContactChannelFlags(input: {
  email?: string | null;
  phoneE164?: string | null;
}) {
  const normalizedEmail = normalizeEmailValue(input.email);
  const normalizedPhone = normalizePhoneValue(input.phoneE164);

  const hasValidEmail = normalizedEmail
    ? SIMPLE_EMAIL_REGEX.test(normalizedEmail)
    : null;
  const hasEmailableAddress =
    normalizedEmail && hasValidEmail === true
      ? true
      : normalizedEmail
        ? false
        : null;
  const hasValidNumber = normalizedPhone
    ? SIMPLE_E164_REGEX.test(normalizedPhone)
    : null;

  return {
    email: normalizedEmail,
    phoneE164: normalizedPhone,
    hasValidEmail,
    hasEmailableAddress,
    hasValidNumber,
  };
}
