export type ContactImportPlanCode =
  | "free"
  | "basic"
  | "growth"
  | "pro"
  | "custom";

const CONTACT_IMPORT_LIMITS: Record<ContactImportPlanCode, number> = {
  free: 100,
  basic: 1000,
  growth: 5000,
  pro: 10000,
  custom: 10000,
};

const CONTACT_IMPORT_PLAN_ALIASES: Record<string, ContactImportPlanCode> = {
  experimental: "basic",
  starter: "basic",
  scale: "pro",
};

export function normalizeContactImportPlanCode(
  planCode?: string | null
): ContactImportPlanCode {
  const normalized = (planCode ?? "free").trim().toLowerCase();

  if (!normalized) {
    return "free";
  }

  if (normalized in CONTACT_IMPORT_PLAN_ALIASES) {
    return CONTACT_IMPORT_PLAN_ALIASES[normalized];
  }

  switch (normalized) {
    case "free":
    case "basic":
    case "growth":
    case "pro":
    case "custom":
      return normalized;
    default:
      return "free";
  }
}

export function getContactImportLimit(planCode?: string | null): number {
  return CONTACT_IMPORT_LIMITS[normalizeContactImportPlanCode(planCode)];
}
