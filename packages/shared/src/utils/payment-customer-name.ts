const NAME_MIN = 2;
const NAME_MAX = 50;
const ALLOWED_CHARS = /[^a-zA-ZÀ-ÿ\s,.''-]/g;

function sanitize(value: string): string {
  return value.replace(ALLOWED_CHARS, "").trim();
}

function abbreviateFirst(
  first: string,
  last: string
): { first: string; last: string } {
  if (first.length + last.length <= NAME_MAX * 2) {
    return { first, last };
  }

  return {
    first: first.charAt(0) + ".",
    last: last.slice(0, NAME_MAX),
  };
}

export function normalizePaymentCustomerName(fullName: string): {
  first: string;
  last: string;
} {
  const parts = sanitize(fullName).split(/\s+/).filter(Boolean);
  let first = parts[0] || "Customer";
  let last = parts.slice(1).join(" ") || "Customer";

  if (first.length < NAME_MIN) {
    first = first.padEnd(NAME_MIN, ".");
  }
  if (last.length < NAME_MIN) {
    last = last.padEnd(NAME_MIN, ".");
  }

  if (first.length > NAME_MAX) {
    first = first.slice(0, NAME_MAX);
  }
  if (last.length > NAME_MAX) {
    const result = abbreviateFirst(first, last);
    first = result.first;
    last = result.last;
  }

  return { first, last };
}
