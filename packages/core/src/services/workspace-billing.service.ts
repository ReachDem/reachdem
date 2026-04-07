import { prisma } from "@reachdem/database";
import type { WorkspaceBillingSummary } from "@reachdem/shared";
import { BillingCatalogService } from "./billing-catalog.service";
import { PlanEntitlementsService } from "./plan-entitlements.service";

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function isSameInstant(left: Date | null, right: Date): boolean {
  return left?.getTime() === right.getTime();
}

export class WorkspaceBillingService {
  static async getSummary(
    organizationId: string
  ): Promise<WorkspaceBillingSummary | null> {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        planCode: true,
        creditBalance: true,
        creditCurrency: true,
        workspaceVerificationStatus: true,
        workspaceVerifiedAt: true,
        senderId: true,
        smsQuotaUsed: true,
        smsQuotaPeriodStartedAt: true,
        emailQuotaUsed: true,
        emailQuotaPeriodStartedAt: true,
      },
    });

    if (!organization) {
      return null;
    }

    const normalizedPlanCode = BillingCatalogService.normalizePlanCode(
      organization.planCode
    );
    const entitlements = PlanEntitlementsService.get(normalizedPlanCode);
    const now = new Date();
    const smsQuotaPeriodStartedAt = startOfUtcMonth(now);
    const emailQuotaPeriodStartedAt = startOfUtcDay(now);
    const smsQuotaUsed = isSameInstant(
      organization.smsQuotaPeriodStartedAt,
      smsQuotaPeriodStartedAt
    )
      ? organization.smsQuotaUsed
      : 0;
    const emailQuotaUsed = isSameInstant(
      organization.emailQuotaPeriodStartedAt,
      emailQuotaPeriodStartedAt
    )
      ? organization.emailQuotaUsed
      : 0;

    return {
      organizationId: organization.id,
      planCode: normalizedPlanCode,
      creditBalance: organization.creditBalance,
      creditCurrency: organization.creditCurrency,
      workspaceVerificationStatus: organization.workspaceVerificationStatus,
      workspaceVerifiedAt: organization.workspaceVerifiedAt,
      senderId: organization.senderId,
      smsQuotaUsed,
      smsQuotaPeriodStartedAt,
      emailQuotaUsed,
      emailQuotaPeriodStartedAt,
      smsIncludedLimit: entitlements.smsIncludedLimit,
      emailIncludedLimit: entitlements.emailIncludedLimit,
      smsQuotaRemaining:
        entitlements.smsIncludedLimit == null
          ? null
          : Math.max(0, entitlements.smsIncludedLimit - smsQuotaUsed),
      emailQuotaRemaining:
        entitlements.emailIncludedLimit == null
          ? null
          : Math.max(0, entitlements.emailIncludedLimit - emailQuotaUsed),
      usesSharedCredits: true,
      availablePlans: BillingCatalogService.getPlanCatalog(),
      creditPricing: BillingCatalogService.getCreditPricing(),
      messagePricing: BillingCatalogService.getMessagePricing(
        organization.creditCurrency
      ),
    };
  }
}
