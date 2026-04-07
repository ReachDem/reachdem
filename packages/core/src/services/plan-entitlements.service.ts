import { BillingCatalogService } from "./billing-catalog.service";

type Channel = "sms" | "email";

export interface PlanEntitlements {
  planCode: string;
  smsIncludedLimit: number | null;
  emailIncludedLimit: number | null;
  smsQuotaPeriod: "monthly" | null;
  emailQuotaPeriod: "daily" | null;
}

export class PlanEntitlementsService {
  static get(planCode?: string | null): PlanEntitlements {
    const normalized = BillingCatalogService.normalizePlanCode(planCode);

    if (normalized === "free") {
      return {
        planCode: normalized,
        smsIncludedLimit: null,
        emailIncludedLimit: null,
        smsQuotaPeriod: null,
        emailQuotaPeriod: null,
      };
    }

    if (normalized === "experimental") {
      return {
        planCode: normalized,
        smsIncludedLimit: null,
        emailIncludedLimit: null,
        smsQuotaPeriod: null,
        emailQuotaPeriod: null,
      };
    }

    if (normalized === "basic") {
      return {
        planCode: normalized,
        smsIncludedLimit: 150,
        emailIncludedLimit: 250,
        smsQuotaPeriod: "monthly",
        emailQuotaPeriod: "daily",
      };
    }

    if (normalized === "growth") {
      return {
        planCode: normalized,
        smsIncludedLimit: 500,
        emailIncludedLimit: 1000,
        smsQuotaPeriod: "monthly",
        emailQuotaPeriod: "daily",
      };
    }

    if (normalized === "pro") {
      return {
        planCode: normalized,
        smsIncludedLimit: 2000,
        emailIncludedLimit: 5000,
        smsQuotaPeriod: "monthly",
        emailQuotaPeriod: "daily",
      };
    }

    return {
      planCode: normalized,
      smsIncludedLimit: null,
      emailIncludedLimit: null,
      smsQuotaPeriod: null,
      emailQuotaPeriod: null,
    };
  }

  static applyCreditPurchaseStatus(
    plan: PlanEntitlements,
    options: { totalPurchasedMinor: number }
  ): PlanEntitlements {
    if (plan.planCode === "free" && options.totalPurchasedMinor > 2500) {
      return {
        ...plan,
        smsIncludedLimit: null,
        emailIncludedLimit: null,
        smsQuotaPeriod: null,
        emailQuotaPeriod: null,
      };
    }

    return plan;
  }

  static getRemainingIncluded(
    plan: PlanEntitlements,
    usage: { smsQuotaUsed: number; emailQuotaUsed: number },
    channel: Channel
  ): number | null {
    if (channel === "sms") {
      if (plan.smsIncludedLimit == null) return null;
      return Math.max(0, plan.smsIncludedLimit - usage.smsQuotaUsed);
    }

    if (plan.emailIncludedLimit == null) return null;
    return Math.max(0, plan.emailIncludedLimit - usage.emailQuotaUsed);
  }
}
