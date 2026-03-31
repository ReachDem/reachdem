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

    return {
      planCode: normalized,
      smsIncludedLimit: null,
      emailIncludedLimit: null,
      usesSharedCredits: true,
    };
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
