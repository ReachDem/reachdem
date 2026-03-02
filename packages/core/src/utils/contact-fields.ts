import { ContactFieldDefinition } from "@reachdem/database";

export const MAX_CUSTOM_FIELDS_PER_ORG = 5;

export function validateCustomFields(
  customFields: Record<string, unknown>,
  definitions: ContactFieldDefinition[]
): { isValid: boolean; error?: string } {
  const defMap = new Map(definitions.map((def) => [def.key, def]));

  for (const [key, value] of Object.entries(customFields)) {
    const def = defMap.get(key);
    if (!def) {
      return {
        isValid: false,
        error: `Custom field key '${key}' is not defined for this workspace`,
      };
    }

    let isValid = false;
    switch (def.type) {
      case "TEXT":
        isValid = typeof value === "string";
        break;
      case "NUMBER":
        isValid = typeof value === "number" && !isNaN(value);
        break;
      case "BOOLEAN":
        isValid = typeof value === "boolean";
        break;
      case "URL":
        if (typeof value === "string") {
          try {
            new URL(value);
            isValid = true;
          } catch {}
        }
        break;
      case "DATE":
        if (typeof value === "string") {
          isValid = !isNaN(new Date(value).getTime());
        }
        break;
      case "SELECT":
        const allowedOptions = (def.options as string[]) || [];
        isValid = typeof value === "string" && allowedOptions.includes(value);
        break;
    }

    if (!isValid) {
      return {
        isValid: false,
        error: `Invalid value for custom field '${key}'. Expected type: ${def.type}`,
      };
    }
  }

  return { isValid: true };
}
