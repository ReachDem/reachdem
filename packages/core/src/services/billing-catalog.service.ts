import type {
  BillingPlan,
  BillingPlanCode,
  CreditPricing,
} from "@reachdem/shared";

const DEFAULT_CURRENCY = "XAF";
const DEFAULT_CREDIT_MINIMUM_QUANTITY = 250;
const DEFAULT_CREDIT_MINIMUM_AMOUNT_MINOR = 250;
const DEFAULT_EMAIL_UNIT_AMOUNT_MINOR = 5;
const DEFAULT_FREE_TRIAL_SMS_LIMIT = 5;
const PLAN_ALIASES: Record<string, BillingPlanCode> = {
  experimental: "basic",
  starter: "basic",
  scale: "pro",
};

function readPositiveIntEnv(
  keys: string[],
  fallback: number | null = null
): number | null {
  for (const key of keys) {
    const raw = process.env[key];
    const value = Number(raw);
    if (raw && Number.isFinite(value) && value > 0) {
      return Math.round(value);
    }
  }

  return fallback;
}

function getCurrency(): string {
  return (
    process.env.PAYMENT_DEFAULT_CURRENCY ?? DEFAULT_CURRENCY
  ).toUpperCase();
}

function formatTierLabel(args: {
  minimumQuantity: number;
  nextMinimumQuantity?: number;
  unitAmountMinor: number;
  currency: string;
}): string {
  const { currency, minimumQuantity, nextMinimumQuantity, unitAmountMinor } =
    args;

  if (!nextMinimumQuantity) {
    return `${minimumQuantity.toLocaleString()}+ SMS: ${unitAmountMinor} ${currency}/SMS`;
  }

  return `${minimumQuantity.toLocaleString()} - ${(nextMinimumQuantity - 1).toLocaleString()} SMS: ${unitAmountMinor} ${currency}/SMS`;
}

export class BillingCatalogService {
  static normalizePlanCode(planCode?: string | null): BillingPlanCode {
    const normalized = (planCode ?? "free").trim().toLowerCase();

    if (!normalized) {
      return "free";
    }

    if (normalized in PLAN_ALIASES) {
      return PLAN_ALIASES[normalized];
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

  static getPlanCatalog(): BillingPlan[] {
    const currency = getCurrency();

    return [
      {
        code: "basic",
        name: "Basic",
        description:
          "Built for early teams that need simple outreach without scattered tools.",
        priceMinor:
          readPositiveIntEnv(
            [
              "PAYMENT_PLAN_BASIC_AMOUNT_MINOR",
              "PAYMENT_PLAN_STARTER_AMOUNT_MINOR",
            ],
            5000
          ) ?? 5000,
        currency,
        interval: "monthly",
        features: [
          "Bulk SMS sends with a clean sending workflow",
          "Contact lists with CSV import and manual entry",
          "Basic link tracking to monitor clicks",
        ],
        highlighted: false,
        contactSales: false,
      },
      {
        code: "growth",
        name: "Growth",
        description:
          "The core package for businesses that want multichannel campaigns and measurable ROI.",
        priceMinor:
          readPositiveIntEnv(["PAYMENT_PLAN_GROWTH_AMOUNT_MINOR"], 15000) ??
          15000,
        currency,
        interval: "monthly",
        features: [
          "SMS and email campaigns from one workspace",
          "Dynamic audience segmentation and filters",
          "Reusable message templates for repeat sends",
          "Campaign analytics and ROI-oriented reporting",
          "Automation flows for status updates and follow-ups",
          "Short links with attribution and click tracking",
        ],
        highlighted: true,
        contactSales: false,
      },
      {
        code: "pro",
        name: "Pro",
        description:
          "Higher-control delivery for teams managing volume, approvals, and integrations.",
        priceMinor:
          readPositiveIntEnv(
            [
              "PAYMENT_PLAN_PRO_AMOUNT_MINOR",
              "PAYMENT_PLAN_SCALE_AMOUNT_MINOR",
            ],
            50000
          ) ?? 50000,
        currency,
        interval: "monthly",
        features: [
          "Everything in Growth, with higher sending volume",
          "Multi-workspace setup for clients, brands, or teams",
          "Advanced roles and approval workflows",
          "Priority support for operational campaigns",
          "Webhooks and integration-ready architecture",
          "Dedicated onboarding for team rollout",
        ],
        highlighted: false,
        contactSales: false,
      },
      {
        code: "custom",
        name: "Custom Enterprise",
        description:
          "Designed for custom business rules, integrations, compliance needs, and dedicated rollout support.",
        priceMinor: null,
        currency,
        interval: "custom",
        features: [
          "Custom integrations and API design support",
          "Dedicated account setup and migration help",
          "SLA, governance, and deployment planning",
          "Role-specific workflows for larger organizations",
          "Webhook, reporting, and data export requirements",
          "Commercial terms adapted to your volume",
        ],
        highlighted: false,
        contactSales: true,
      },
    ];
  }

  static getPlan(planCode?: string | null): BillingPlan | null {
    const normalized = this.normalizePlanCode(planCode);
    return (
      this.getPlanCatalog().find((plan) => plan.code === normalized) ?? null
    );
  }

  static getPlanAmountMinor(planCode?: string | null): number {
    const plan = this.getPlan(planCode);
    if (!plan || plan.priceMinor == null) {
      throw new Error(`Plan ${planCode ?? "unknown"} is not purchasable`);
    }

    return plan.priceMinor;
  }

  static getCreditMinimumAmountMinor(): number {
    return (
      readPositiveIntEnv(
        ["PAYMENT_CREDIT_MINIMUM_AMOUNT_MINOR"],
        DEFAULT_CREDIT_MINIMUM_AMOUNT_MINOR
      ) ?? DEFAULT_CREDIT_MINIMUM_AMOUNT_MINOR
    );
  }

  static getBalanceCurrency(): string {
    return getCurrency();
  }

  static getSmsUnitAmountMinor(): number {
    return (
      readPositiveIntEnv(
        ["PAYMENT_SMS_UNIT_AMOUNT_MINOR", "PAYMENT_CREDIT_UNIT_AMOUNT_MINOR"],
        25
      ) ?? 25
    );
  }

  static getEmailUnitAmountMinor(): number {
    return (
      readPositiveIntEnv(
        ["PAYMENT_EMAIL_UNIT_AMOUNT_MINOR"],
        DEFAULT_EMAIL_UNIT_AMOUNT_MINOR
      ) ?? DEFAULT_EMAIL_UNIT_AMOUNT_MINOR
    );
  }

  static getFreeTrialSmsLimit(): number {
    return (
      readPositiveIntEnv(
        ["PAYMENT_FREE_TRIAL_SMS_LIMIT"],
        DEFAULT_FREE_TRIAL_SMS_LIMIT
      ) ?? DEFAULT_FREE_TRIAL_SMS_LIMIT
    );
  }

  static getFreeTrialBalanceMinor(): number {
    return this.getFreeTrialSmsLimit() * this.getSmsUnitAmountMinor();
  }

  static getMessageUnitAmountMinor(channel: "sms" | "email"): number {
    return channel === "sms"
      ? this.getSmsUnitAmountMinor()
      : this.getEmailUnitAmountMinor();
  }

  static getMessageUsageCostMinor(channel: "sms" | "email", units = 1): number {
    if (units <= 0) {
      return 0;
    }

    return this.getMessageUnitAmountMinor(channel) * units;
  }

  static getUsagePricing() {
    return {
      currency: this.getBalanceCurrency(),
      smsUnitAmountMinor: this.getSmsUnitAmountMinor(),
      emailUnitAmountMinor: this.getEmailUnitAmountMinor(),
      freeTrialSmsLimit: this.getFreeTrialSmsLimit(),
      freeTrialBalanceMinor: this.getFreeTrialBalanceMinor(),
    };
  }

  static getCreditPricing(): CreditPricing {
    const currency = getCurrency();
    const minimumQuantity =
      readPositiveIntEnv(
        ["PAYMENT_CREDIT_MINIMUM_QUANTITY"],
        DEFAULT_CREDIT_MINIMUM_QUANTITY
      ) ?? DEFAULT_CREDIT_MINIMUM_QUANTITY;
    const baseUnitAmountMinor = readPositiveIntEnv([
      "PAYMENT_CREDIT_UNIT_AMOUNT_MINOR",
    ]);
    const volumeDiscountThreshold = readPositiveIntEnv([
      "PAYMENT_CREDIT_VOLUME_DISCOUNT_THRESHOLD",
    ]);
    const volumeDiscountUnitAmountMinor = readPositiveIntEnv([
      "PAYMENT_CREDIT_VOLUME_DISCOUNT_UNIT_AMOUNT_MINOR",
    ]);

    if (baseUnitAmountMinor) {
      const tiers = [
        {
          minimumQuantity: 1,
          unitAmountMinor: baseUnitAmountMinor,
        },
      ];

      if (
        volumeDiscountThreshold &&
        volumeDiscountUnitAmountMinor &&
        volumeDiscountThreshold > 1 &&
        volumeDiscountUnitAmountMinor < baseUnitAmountMinor
      ) {
        tiers.push({
          minimumQuantity: volumeDiscountThreshold,
          unitAmountMinor: volumeDiscountUnitAmountMinor,
        });
      }

      const sortedTiers = tiers.sort(
        (left, right) => left.minimumQuantity - right.minimumQuantity
      );

      return {
        currency,
        minimumQuantity,
        tiers: sortedTiers.map((tier, index) => ({
          minimumQuantity: tier.minimumQuantity,
          unitAmountMinor: tier.unitAmountMinor,
          label: formatTierLabel({
            minimumQuantity: tier.minimumQuantity,
            nextMinimumQuantity: sortedTiers[index + 1]?.minimumQuantity,
            unitAmountMinor: tier.unitAmountMinor,
            currency,
          }),
        })),
      };
    }

    return {
      currency,
      minimumQuantity,
      tiers: [
        {
          minimumQuantity: 1,
          unitAmountMinor: 25, // 30 XAF - 5 XAF
          label: `0 - 5k SMS: 25 ${currency}/SMS`,
        },
        {
          minimumQuantity: 5000,
          unitAmountMinor: 22, // 27 XAF - 5 XAF
          label: `5k - 20k SMS: 22 ${currency}/SMS`,
        },
        {
          minimumQuantity: 20000,
          unitAmountMinor: 20, // 25 XAF - 5 XAF
          label: `20k - 100k SMS: 20 ${currency}/SMS`,
        },
        {
          minimumQuantity: 100000,
          unitAmountMinor: 18, // 23 XAF - 5 XAF
          label: `100k+ SMS: 18 ${currency}/SMS`,
        },
      ],
    };
  }

  static calculateCreditAmountMinor(quantity: number): number {
    const pricing = this.getCreditPricing();
    const tier =
      [...pricing.tiers]
        .sort((left, right) => right.minimumQuantity - left.minimumQuantity)
        .find((candidate) => quantity >= candidate.minimumQuantity) ??
      pricing.tiers[0];

    return tier.unitAmountMinor * quantity;
  }
}
