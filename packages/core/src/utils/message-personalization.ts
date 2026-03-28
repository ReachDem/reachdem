type ContactLike = {
  name?: string | null;
  email?: string | null;
  phoneE164?: string | null;
  work?: string | null;
  enterprise?: string | null;
  address?: string | null;
  customFields?: unknown;
};

type PersonalizeTemplateOptions = {
  html?: boolean;
};

const VARIABLE_PATTERN = /\{\{\s*([^}]+?)\s*\}\}/g;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeVariableName(variable: string): string {
  return variable.trim().replaceAll(/\s+/g, "").toLowerCase();
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getNameParts(name: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const normalized = name?.trim() ?? "";
  if (!normalized) {
    return { firstName: "", lastName: "" };
  }

  const [firstName = "", ...rest] = normalized.split(/\s+/);
  return {
    firstName,
    lastName: rest.join(" "),
  };
}

function getCustomFieldValue(
  customFields: Record<string, unknown>,
  key: string
): string | null {
  const directValue = customFields[key];
  if (
    typeof directValue === "string" ||
    typeof directValue === "number" ||
    typeof directValue === "boolean"
  ) {
    return String(directValue);
  }

  const normalizedKey = key.toLowerCase();
  for (const [entryKey, entryValue] of Object.entries(customFields)) {
    if (entryKey.toLowerCase() !== normalizedKey) {
      continue;
    }

    if (
      typeof entryValue === "string" ||
      typeof entryValue === "number" ||
      typeof entryValue === "boolean"
    ) {
      return String(entryValue);
    }
  }

  return null;
}

function resolveVariableValue(contact: ContactLike | null, variable: string) {
  if (!contact) {
    return null;
  }

  const normalized = normalizeVariableName(variable);
  const customFields = toRecord(contact.customFields);
  const { firstName, lastName } = getNameParts(contact.name);
  const company =
    contact.enterprise?.trim() ||
    contact.work?.trim() ||
    getCustomFieldValue(customFields, "company") ||
    "";

  const baseValues: Record<string, string> = {
    "contact.name": contact.name?.trim() ?? "",
    "contact.fullname": contact.name?.trim() ?? "",
    "contact.firstname": firstName,
    "contact.lastname": lastName,
    "contact.email": contact.email?.trim() ?? "",
    "contact.phone": contact.phoneE164?.trim() ?? "",
    "contact.phonee164": contact.phoneE164?.trim() ?? "",
    "contact.company": company,
    "contact.enterprise": contact.enterprise?.trim() ?? "",
    "contact.work": contact.work?.trim() ?? "",
    "contact.address": contact.address?.trim() ?? "",
    firstname: firstName,
    lastname: lastName,
    fullname: contact.name?.trim() ?? "",
    name: contact.name?.trim() ?? "",
    email: contact.email?.trim() ?? "",
    phone: contact.phoneE164?.trim() ?? "",
    company,
  };

  if (normalized in baseValues) {
    return baseValues[normalized] ?? "";
  }

  if (normalized.startsWith("contact.")) {
    return getCustomFieldValue(
      customFields,
      normalized.slice("contact.".length)
    );
  }

  return getCustomFieldValue(customFields, normalized);
}

export function personalizeTemplate(
  template: string,
  contact: ContactLike | null,
  options: PersonalizeTemplateOptions = {}
): string {
  if (!template.includes("{{")) {
    return template;
  }

  return template.replace(VARIABLE_PATTERN, (fullMatch, rawVariable) => {
    const resolved = resolveVariableValue(contact, rawVariable);
    if (resolved == null) {
      return fullMatch;
    }

    return options.html ? escapeHtml(resolved) : resolved;
  });
}
