import { prisma } from "@reachdem/database";
import type { WorkspaceBillingSummary } from "@reachdem/shared";
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

    const entitlements = PlanEntitlementsService.get(organization.planCode);

    return {
      organizationId: organization.id,
      planCode: organization.planCode,
      creditBalance: organization.creditBalance,
      workspaceVerificationStatus: organization.workspaceVerificationStatus,
      workspaceVerifiedAt: organization.workspaceVerifiedAt,
      senderId: organization.senderId,
      smsQuotaUsed: organization.smsQuotaUsed,
      emailQuotaUsed: organization.emailQuotaUsed,
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
      usesSharedCredits: entitlements.usesSharedCredits,
    };
  }
}
