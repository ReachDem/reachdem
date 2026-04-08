import { Prisma, prisma } from "@reachdem/database";
import { apiPricingTierSchema, type ApiPricingTier } from "@reachdem/shared";
import { BillingCatalogService } from "./billing-catalog.service";
import { BillingConfigurationError } from "../errors/billing.errors";

type DbClient = typeof prisma | Prisma.TransactionClient;

const DEFAULT_PROFILE_NAME = "Default API Pricing";

function parseTierJson(value: string | undefined): ApiPricingTier[] | null {
  if (!value) return null;

  try {
    return apiPricingTierSchema.array().min(1).parse(JSON.parse(value));
  } catch {
    throw new BillingConfigurationError("Invalid API pricing tier JSON");
  }
}

function defaultTiers(channel: "sms" | "email"): ApiPricingTier[] {
  const pricing = BillingCatalogService.getMessagePricing();
  const tiers = channel === "sms" ? pricing.smsTiers : pricing.emailTiers;
  return tiers.map((tier) => ({
    minimumQuantity: tier.minimumQuantity,
    unitAmountMinor: tier.unitAmountMinor,
  }));
}

function coerceTiers(value: Prisma.JsonValue, label: string): ApiPricingTier[] {
  const result = apiPricingTierSchema.array().min(1).safeParse(value);
  if (!result.success) {
    throw new BillingConfigurationError(`Invalid ${label} pricing tiers`);
  }

  return result.data;
}

function resolveTier(tiers: ApiPricingTier[], units: number): ApiPricingTier {
  const tier = [...tiers]
    .sort((left, right) => right.minimumQuantity - left.minimumQuantity)
    .find((candidate) => units >= candidate.minimumQuantity);

  if (!tier) {
    throw new BillingConfigurationError("No pricing tier matches the usage");
  }

  return tier;
}

export type ResolvedMessagePrice = {
  pricingProfileId: string;
  currency: string;
  unitPriceMinor: number;
  totalPriceMinor: number;
};

export class ApiPricingService {
  static async upsertDefaultFromEnv(db: typeof prisma = prisma): Promise<void> {
    const profileName =
      process.env.API_DEFAULT_PRICING_PROFILE_NAME ?? DEFAULT_PROFILE_NAME;
    const currency = (
      process.env.API_DEFAULT_PRICING_CURRENCY ??
      process.env.PAYMENT_DEFAULT_CURRENCY ??
      "XAF"
    ).toUpperCase();
    const smsTiers =
      parseTierJson(process.env.API_DEFAULT_SMS_TIERS_JSON) ??
      defaultTiers("sms");
    const emailTiers =
      parseTierJson(process.env.API_DEFAULT_EMAIL_TIERS_JSON) ??
      defaultTiers("email");

    await db.$transaction(async (tx) => {
      const existing = await tx.apiPricingProfile.findFirst({
        where: { isDefault: true },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });

      if (existing) {
        await tx.apiPricingProfile.update({
          where: { id: existing.id },
          data: {
            name: profileName,
            currency,
            active: true,
            isDefault: true,
            smsTiers,
            emailTiers,
          },
        });
        await tx.apiPricingProfile.updateMany({
          where: { isDefault: true, id: { not: existing.id } },
          data: { isDefault: false },
        });
        return;
      }

      await tx.apiPricingProfile.create({
        data: {
          name: profileName,
          currency,
          active: true,
          isDefault: true,
          smsTiers,
          emailTiers,
        },
      });
    });
  }

  static async resolveProfile(db: DbClient, apiKeyId?: string | null) {
    if (apiKeyId) {
      const apiKey = await db.apiKey.findUnique({
        where: { id: apiKeyId },
        select: {
          pricingProfile: {
            select: {
              id: true,
              currency: true,
              active: true,
              smsTiers: true,
              emailTiers: true,
            },
          },
        },
      });

      if (apiKey?.pricingProfile?.active) {
        return apiKey.pricingProfile;
      }
    }

    const defaultProfile = await db.apiPricingProfile.findFirst({
      where: { isDefault: true, active: true },
      select: {
        id: true,
        currency: true,
        active: true,
        smsTiers: true,
        emailTiers: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (!defaultProfile) {
      throw new BillingConfigurationError(
        "No active default API pricing profile exists"
      );
    }

    return defaultProfile;
  }

  static async resolveMessagePrice(
    db: DbClient,
    input: {
      apiKeyId?: string | null;
      channel: "sms" | "email";
      units: number;
    }
  ): Promise<ResolvedMessagePrice> {
    if (!Number.isInteger(input.units) || input.units <= 0) {
      throw new BillingConfigurationError("Billing units must be positive");
    }

    const profile = await this.resolveProfile(db, input.apiKeyId);
    const tiers = coerceTiers(
      input.channel === "sms" ? profile.smsTiers : profile.emailTiers,
      input.channel
    );
    const tier = resolveTier(tiers, input.units);

    return {
      pricingProfileId: profile.id,
      currency: profile.currency.toUpperCase(),
      unitPriceMinor: tier.unitAmountMinor,
      totalPriceMinor: tier.unitAmountMinor * input.units,
    };
  }
}
