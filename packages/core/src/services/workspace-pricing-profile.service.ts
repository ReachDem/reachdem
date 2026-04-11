import { prisma } from "@reachdem/database";
import type { MessageChannel } from "@reachdem/shared";
import { BillingCatalogService } from "./billing-catalog.service";

type WorkspacePricingProfile = {
  baseCurrency: string;
  source: "default" | "top_up";
  appliedTopUpAmountMinor: number;
  smsUnitAmountMinor: number;
  emailUnitAmountMinor: number;
  updatedAt: string | null;
};

type OrganizationMetadataShape = {
  messagingPricing?: WorkspacePricingProfile;
  [key: string]: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function parseOrganizationMetadata(
  raw: string | null
): OrganizationMetadataShape {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return asRecord(parsed) ?? {};
  } catch {
    return {};
  }
}

function parseProfile(value: unknown): WorkspacePricingProfile | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const baseCurrency = asString(record.baseCurrency);
  const source = asString(record.source);
  const smsUnitAmountMinor = asNumber(record.smsUnitAmountMinor);
  const emailUnitAmountMinor = asNumber(record.emailUnitAmountMinor);
  const appliedTopUpAmountMinor = asNumber(record.appliedTopUpAmountMinor);
  const updatedAt = asString(record.updatedAt);

  if (
    !baseCurrency ||
    (source !== "default" && source !== "top_up") ||
    !smsUnitAmountMinor ||
    !emailUnitAmountMinor ||
    appliedTopUpAmountMinor == null
  ) {
    return null;
  }

  return {
    baseCurrency,
    source,
    smsUnitAmountMinor,
    emailUnitAmountMinor,
    appliedTopUpAmountMinor,
    updatedAt,
  };
}

export class WorkspacePricingProfileService {
  static getDefaultProfile(): WorkspacePricingProfile {
    const baseCurrency = BillingCatalogService.getBalanceCurrency();

    return {
      baseCurrency,
      source: "default",
      appliedTopUpAmountMinor:
        BillingCatalogService.getCreditMinimumAmountMinor(),
      smsUnitAmountMinor: BillingCatalogService.resolveUnitAmountForTopUp(
        "sms",
        BillingCatalogService.getCreditMinimumAmountMinor()
      ),
      emailUnitAmountMinor: BillingCatalogService.resolveUnitAmountForTopUp(
        "email",
        BillingCatalogService.getCreditMinimumAmountMinor()
      ),
      updatedAt: null,
    };
  }

  static getProfileFromOrganizationMetadata(
    rawMetadata: string | null
  ): WorkspacePricingProfile {
    const metadata = parseOrganizationMetadata(rawMetadata);
    return parseProfile(metadata.messagingPricing) ?? this.getDefaultProfile();
  }

  static getUnitAmountMinorFromMetadata(
    rawMetadata: string | null,
    channel: MessageChannel
  ): number {
    const profile = this.getProfileFromOrganizationMetadata(rawMetadata);
    return channel === "sms"
      ? profile.smsUnitAmountMinor
      : profile.emailUnitAmountMinor;
  }

  static async saveFromTopUp(args: {
    organizationId: string;
    appliedTopUpAmountMinor: number;
  }): Promise<void> {
    const organization = await prisma.organization.findUnique({
      where: { id: args.organizationId },
      select: { metadata: true },
    });

    if (!organization) {
      return;
    }

    const metadata = parseOrganizationMetadata(organization.metadata);
    metadata.messagingPricing = {
      baseCurrency: BillingCatalogService.getBalanceCurrency(),
      source: "top_up",
      appliedTopUpAmountMinor: Math.max(
        args.appliedTopUpAmountMinor,
        BillingCatalogService.getCreditMinimumAmountMinor()
      ),
      smsUnitAmountMinor: BillingCatalogService.resolveUnitAmountForTopUp(
        "sms",
        args.appliedTopUpAmountMinor
      ),
      emailUnitAmountMinor: BillingCatalogService.resolveUnitAmountForTopUp(
        "email",
        args.appliedTopUpAmountMinor
      ),
      updatedAt: new Date().toISOString(),
    };

    await prisma.organization.update({
      where: { id: args.organizationId },
      data: {
        metadata: JSON.stringify(metadata),
      },
    });
  }
}
