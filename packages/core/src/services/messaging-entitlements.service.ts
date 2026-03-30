import { Prisma, prisma } from "@reachdem/database";
import { PlanEntitlementsService } from "./plan-entitlements.service";
import {
  MessageInsufficientCreditsError,
  MessageSendValidationError,
} from "../errors/messaging.errors";

type DbClient = typeof prisma | Prisma.TransactionClient;
type MessagingChannel = "sms" | "email";

export class MessagingEntitlementsService {
  private static readonly DEFAULT_SMS_SENDER_ID = "ReachDem";

  static async reserveMessageSend(
    db: DbClient,
    organizationId: string,
    channel: MessagingChannel,
    units = 1
  ): Promise<{ senderId: string | null }> {
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        planCode: true,
        creditBalance: true,
        smsQuotaUsed: true,
        emailQuotaUsed: true,
        senderId: true,
        workspaceVerificationStatus: true,
      },
    });

    if (!organization) {
      throw new MessageSendValidationError("Organization not found");
    }

    // 1. Calculate historical purchases logic
    const totalPurchasesResult = await db.paymentSession.aggregate({
      where: {
        organizationId,
        status: "succeeded",
      },
      _sum: {
        amountMinor: true,
      },
    });
    const totalPurchasedMinor = totalPurchasesResult._sum.amountMinor || 0;

    // 2. Resolve final quotas
    const entitlements = PlanEntitlementsService.applyCreditPurchaseStatus(
      PlanEntitlementsService.get(organization.planCode),
      { totalPurchasedMinor }
    );

    // 3. Verify maximum capacity restrictions (Quota Check)
    const remainingIncluded = PlanEntitlementsService.getRemainingIncluded(
      entitlements,
      {
        smsQuotaUsed: organization.smsQuotaUsed,
        emailQuotaUsed: organization.emailQuotaUsed,
      },
      channel
    );

    if (remainingIncluded != null) {
      if (units > remainingIncluded) {
        throw new MessageInsufficientCreditsError(
          `Sending limit reached for ${channel} under plan ${entitlements.planCode}. Upgrade plan or wait for reset.`
        );
      }
    }

    // 4. Verify account funding (Credit Check)
    if (units > organization.creditBalance) {
      throw new MessageInsufficientCreditsError(
        `Insufficient credit balance to send ${units} ${channel} message(s).`
      );
    }

    // 5. Commit increments
    await db.organization.update({
      where: { id: organizationId },
      data: {
        creditBalance: {
          decrement: units,
        },
        // We always track the usage regardless of if the limit is null
        ...(channel === "sms"
          ? {
            smsQuotaUsed: {
              increment: units,
            },
          }
          : {
            emailQuotaUsed: {
              increment: units,
            },
          }),
      },
    });

    const effectiveSenderId =
      channel === "sms" &&
        organization.workspaceVerificationStatus === "verified" &&
        organization.senderId
        ? organization.senderId
        : channel === "sms"
          ? this.DEFAULT_SMS_SENDER_ID
          : null;

    return {
      senderId: effectiveSenderId,
    };
  }
}
