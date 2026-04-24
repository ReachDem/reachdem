/**
 * Variable substitution for Hermes message templates.
 * Supports {{contact.*}} and {{group.name}} placeholders.
 */

export const CONTACT_VARS = [
  "{{contact.name}}",
  "{{contact.firstName}}",
  "{{contact.lastName}}",
  "{{contact.email}}",
  "{{contact.phone}}",
  "{{contact.company}}",
] as const;

export const GROUP_VARS = ["{{group.name}}"] as const;

export type ContactVar = (typeof CONTACT_VARS)[number];
export type GroupVar = (typeof GROUP_VARS)[number];

export interface ContactLike {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneE164?: string | null;
  phone?: string | null;
  enterprise?: string | null;
  company?: string | null;
}

export interface GroupLike {
  name?: string | null;
}

/**
 * Replace all {{contact.*}} variables in a template string.
 * Unresolved variables are left as-is (not removed).
 */
export function substituteContactVariables(
  template: string,
  contact: ContactLike
): string {
  const map: Record<string, string> = {
    "{{contact.name}}": contact.name ?? "",
    "{{contact.firstName}}":
      contact.firstName ?? contact.name?.split(" ")[0] ?? "",
    "{{contact.lastName}}":
      contact.lastName ?? contact.name?.split(" ").slice(1).join(" ") ?? "",
    "{{contact.email}}": contact.email ?? "",
    "{{contact.phone}}": contact.phoneE164 ?? contact.phone ?? "",
    "{{contact.company}}": contact.enterprise ?? contact.company ?? "",
  };

  return template.replace(
    /\{\{contact\.\w+\}\}/g,
    (match) => map[match] ?? match
  );
}

/**
 * Replace {{group.name}} in a template string.
 */
export function substituteGroupVariable(
  template: string,
  group: GroupLike
): string {
  return template.replace(/\{\{group\.name\}\}/g, group.name ?? "");
}

/**
 * Extract all variable placeholders used in a template.
 */
export function extractUsedVariables(template: string): string[] {
  const matches = template.match(/\{\{[\w.]+\}\}/g);
  return [...new Set(matches ?? [])];
}

/**
 * Validate that all variables in a template are known/supported.
 * Returns an array of unknown variables (empty if all valid).
 */
export function validateVariables(template: string): string[] {
  const known = new Set<string>([...CONTACT_VARS, ...GROUP_VARS]);
  return extractUsedVariables(template).filter((v) => !known.has(v));
}
