import { Prisma, prisma } from "@reachdem/database";
import { ApiPricingService } from "./api-pricing.service";
import {
  BillingCurrencyMismatchError,
  BillingInsufficientCreditsError,
} from "../errors/billing.errors";

type DbClient = typeof prisma | Prisma.TransactionClient;

export class BillingRecordService {
  static async billMessageUsage(
    db: DbClient,
    input: {
      organizationId: string;
      apiKeyId?: string | null;
      channel: "sms" | "email";
      units: number;
      messageId?: string | null;
      campaignId?: string | null;
      source: "dashboard" | "publicApi" | "worker" | "system";
      metadata?: Prisma.InputJsonValue;
    }
  ) {
    const price = await ApiPricingService.resolveMessagePrice(db, {
      apiKeyId: input.apiKeyId,
      channel: input.channel,
      units: input.units,
    });

    const organization = await db.organization.findUnique({
      where: { id: input.organizationId },
      select: { creditBalance: true, creditCurrency: true },
    });

    if (!organization) {
      throw new BillingInsufficientCreditsError("Organization not found");
    }

    const walletCurrency = organization.creditCurrency.toUpperCase();
    if (walletCurrency !== price.currency) {
      throw new BillingCurrencyMismatchError(
        `Wallet currency ${walletCurrency} does not match pricing currency ${price.currency}`
      );
    }

    if (organization.creditBalance < price.totalPriceMinor) {
      throw new BillingInsufficientCreditsError();
    }

    await db.organization.update({
      where: { id: input.organizationId },
      data: {
        creditBalance: {
          decrement: price.totalPriceMinor,
        },
      },
    });

    return db.billingRecord.create({
      data: {
        organizationId: input.organizationId,
        apiKeyId: input.apiKeyId ?? null,
        pricingProfileId: price.pricingProfileId,
        channel: input.channel,
        units: input.units,
        unitPriceMinor: price.unitPriceMinor,
        totalPriceMinor: price.totalPriceMinor,
        currency: price.currency,
        walletCurrency,
        fxRate: null,
        messageId: input.messageId ?? null,
        campaignId: input.campaignId ?? null,
        source: input.source,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    });
  }
}
