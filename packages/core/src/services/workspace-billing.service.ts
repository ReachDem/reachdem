import { prisma } from "@reachdem/database";
import type { WorkspaceBillingSummary } from "@reachdem/shared";
import { BillingCatalogService } from "./billing-catalog.service";
import { CreditTopUpService } from "./credit-top-up.service";
import { PlanEntitlementsService } from "./plan-entitlements.service";

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
        workspaceVerificationStatus: true,
        workspaceVerifiedAt: true,
        senderId: true,
        smsQuotaUsed: true,
        emailQuotaUsed: true,
      },
    });

    if (!organization) {
      return null;
    }

    const normalizedPlanCode = BillingCatalogService.normalizePlanCode(
      organization.planCode
    );

    const successfulTopUp = await prisma.paymentSession.findFirst({
      where: {
        organizationId,
        kind: "creditPurchase",
        status: "succeeded",
      },
      select: { id: true },
    });

    const entitlements = PlanEntitlementsService.applyCreditPurchaseStatus(
      PlanEntitlementsService.get(normalizedPlanCode),
      { hasSuccessfulTopUp: Boolean(successfulTopUp) }
    );
    const usagePricing = BillingCatalogService.getUsagePricing();

    return {
      organizationId: organization.id,
      planCode: normalizedPlanCode,
      balanceMinor: organization.creditBalance,
      balanceCurrency: usagePricing.currency,
      creditBalance: organization.creditBalance,
      workspaceVerificationStatus: organization.workspaceVerificationStatus,
      workspaceVerifiedAt: organization.workspaceVerifiedAt,
      senderId: organization.senderId,
      smsQuotaUsed: organization.smsQuotaUsed,
      emailQuotaUsed: organization.emailQuotaUsed,
      hasSuccessfulTopUp: Boolean(successfulTopUp),
      smsIncludedLimit: entitlements.smsIncludedLimit,
      emailIncludedLimit: entitlements.emailIncludedLimit,
      smsQuotaRemaining: PlanEntitlementsService.getRemainingIncluded(
        entitlements,
        {
          smsQuotaUsed: organization.smsQuotaUsed,
          emailQuotaUsed: organization.emailQuotaUsed,
        },
        "sms"
      ),
      emailQuotaRemaining: PlanEntitlementsService.getRemainingIncluded(
        entitlements,
        {
          smsQuotaUsed: organization.smsQuotaUsed,
          emailQuotaUsed: organization.emailQuotaUsed,
        },
        "email"
      ),
      usesSharedCredits: true,
      availablePlans: BillingCatalogService.getPlanCatalog(),
      topUpConfig: CreditTopUpService.getTopUpConfig(),
      usagePricing,
    };
  }
}
