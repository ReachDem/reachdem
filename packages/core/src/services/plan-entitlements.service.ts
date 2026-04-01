import { BillingCatalogService } from "./billing-catalog.service";

type Channel = "sms" | "email";

export interface PlanEntitlements {
  planCode: string;
  smsIncludedLimit: number | null;
  emailIncludedLimit: number | null;
  usesSharedCredits: boolean;
}

export class PlanEntitlementsService {
  static get(planCode?: string | null): PlanEntitlements {
    const normalized = BillingCatalogService.normalizePlanCode(planCode);

    if (normalized === "free") {
      return {
        planCode: normalized,
        smsIncludedLimit: 5,
        emailIncludedLimit: null,
        usesSharedCredits: true,
      };
    }

    return {
      planCode: normalized,
      smsIncludedLimit: null,
      emailIncludedLimit: null,
      usesSharedCredits: true,
    };
  }

  static applyCreditPurchaseStatus(
    plan: PlanEntitlements,
    options: { hasActivatedCreditPurchase: boolean }
  ): PlanEntitlements {
    if (
      plan.planCode === "free" &&
      options.hasActivatedCreditPurchase &&
      plan.smsIncludedLimit != null
    ) {
      return {
        ...plan,
        smsIncludedLimit: null,
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
