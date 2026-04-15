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

export function personalizeTemplate(
  template: string,
  contact: ContactLike | null,
  options: PersonalizeTemplateOptions = {}
): string {
  if (!template.includes("{{") || !contact) {
    return template;
  }

  const customFields = toRecord(contact.customFields);

  // O(N) single pass to cache lowercase keys instead of doing Object.entries on every token
  const lowercaseCustomFields = new Map<string, string>();
  for (const [key, value] of Object.entries(customFields)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      lowercaseCustomFields.set(key.toLowerCase(), String(value));
    }
  }

  const getCustomField = (key: string) => {
    return lowercaseCustomFields.get(key.toLowerCase()) ?? null;
  };

  // Lazy evaluation for name parts to avoid doing it if unused
  let namePartsCache: { firstName: string; lastName: string } | null = null;
  const getLazyNameParts = () => {
    if (!namePartsCache) {
      namePartsCache = getNameParts(contact.name);
    }
    return namePartsCache;
  };

  const getLazyCompany = () => {
    return (
      contact.enterprise?.trim() ||
      contact.work?.trim() ||
      getCustomField("company") ||
      ""
    );
  };

  return template.replace(VARIABLE_PATTERN, (fullMatch, rawVariable) => {
    const normalized = normalizeVariableName(rawVariable);
    let resolved: string | null = null;

    switch (normalized) {
      case "contact.name":
      case "contact.fullname":
      case "fullname":
      case "name":
        resolved = contact.name?.trim() ?? "";
        break;
      case "contact.firstname":
      case "firstname":
        resolved = getLazyNameParts().firstName;
        break;
      case "contact.lastname":
      case "lastname":
        resolved = getLazyNameParts().lastName;
        break;
      case "contact.email":
      case "email":
        resolved = contact.email?.trim() ?? "";
        break;
      case "contact.phone":
      case "contact.phonee164":
      case "phone":
        resolved = contact.phoneE164?.trim() ?? "";
        break;
      case "contact.company":
      case "company":
        resolved = getLazyCompany();
        break;
      case "contact.enterprise":
        resolved = contact.enterprise?.trim() ?? "";
        break;
      case "contact.work":
        resolved = contact.work?.trim() ?? "";
        break;
      case "contact.address":
        resolved = contact.address?.trim() ?? "";
        break;
      default:
        let fieldName = normalized;
        if (normalized.startsWith("contact.")) {
          fieldName = normalized.slice("contact.".length);
        }
        resolved = getCustomField(fieldName);
        break;
    }

    if (resolved == null) {
      return fullMatch;
    }

    return options.html ? escapeHtml(resolved) : resolved;
  });
}
