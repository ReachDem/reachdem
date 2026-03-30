type Channel = "sms" | "email";

export interface PlanEntitlements {
  planCode: string;
  smsIncludedLimit: number | null;
  emailIncludedLimit: number | null;
  usesSharedCredits: boolean;
}

export class PlanEntitlementsService {
  static get(planCode?: string | null): PlanEntitlements {
    switch ((planCode ?? "free").toLowerCase()) {
      case "experimental":
        return {
          planCode: "experimental",
          smsIncludedLimit: 5,
          emailIncludedLimit: 30,
          usesSharedCredits: false,
        };
      default:
        return {
          planCode: (planCode ?? "free").toLowerCase(),
          smsIncludedLimit: null,
          emailIncludedLimit: null,
          usesSharedCredits: true,
        };
    }
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
