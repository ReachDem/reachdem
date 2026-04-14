import { BillingCatalogService } from "./billing-catalog.service";

type Channel = "sms" | "email";

export interface PlanEntitlements {
  planCode: string;
  smsIncludedLimit: number | null;
  emailIncludedLimit: number | null;
}

export class PlanEntitlementsService {
  static get(planCode?: string | null): PlanEntitlements {
    const normalized = BillingCatalogService.normalizePlanCode(planCode);

    if (normalized === "free") {
      return {
        planCode: normalized,
        smsIncludedLimit: BillingCatalogService.getFreeTrialSmsLimit(),
        emailIncludedLimit: null,
      };
    }

    if (normalized === "basic") {
      return {
        planCode: normalized,
        smsIncludedLimit: 150,
        emailIncludedLimit: 250,
      };
    }

    if (normalized === "growth") {
      return {
        planCode: normalized,
        smsIncludedLimit: 500,
        emailIncludedLimit: 1000,
      };
    }

    if (normalized === "pro") {
      return {
        planCode: normalized,
        smsIncludedLimit: 2000,
        emailIncludedLimit: 4000,
      };
    }

    return {
      planCode: normalized,
      smsIncludedLimit: null,
      emailIncludedLimit: null,
    };
  }

  static applyCreditPurchaseStatus(
    plan: PlanEntitlements,
    options: { hasSuccessfulTopUp: boolean }
  ): PlanEntitlements {
    if (plan.planCode === "free" && options.hasSuccessfulTopUp) {
      return {
        ...plan,
        smsIncludedLimit: null,
        emailIncludedLimit: null,
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
