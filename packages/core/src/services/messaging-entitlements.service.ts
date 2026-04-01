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

    const hasActivatedCreditPurchase =
      (await db.paymentSession.count({
        where: {
          organizationId,
          kind: "creditPurchase",
          activatedAt: {
            not: null,
          },
        },
      })) > 0;

    const entitlements = PlanEntitlementsService.applyCreditPurchaseStatus(
      PlanEntitlementsService.get(organization.planCode),
      { hasActivatedCreditPurchase }
    );
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
          `Insufficient ${channel} quota for plan ${entitlements.planCode}`
        );
      }
    }

    if (entitlements.usesSharedCredits && units > organization.creditBalance) {
      throw new MessageInsufficientCreditsError();
    }

    await db.organization.update({
      where: { id: organizationId },
      data: {
        ...(remainingIncluded != null
          ? channel === "sms"
            ? {
                smsQuotaUsed: {
                  increment: units,
                },
              }
            : {
                emailQuotaUsed: {
                  increment: units,
                },
              }
          : {}),
        ...(entitlements.usesSharedCredits
          ? {
              creditBalance: {
                decrement: units,
              },
            }
          : {}),
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
