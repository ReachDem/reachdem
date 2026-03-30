import { Prisma, prisma } from "@reachdem/database";
import { PlanEntitlementsService } from "./plan-entitlements.service";
import {
  MessageInsufficientCreditsError,
  MessageSendValidationError,
} from "../errors/messaging.errors";

type DbClient = typeof prisma | Prisma.TransactionClient;
type MessagingChannel = "sms" | "email";

export class MessagingEntitlementsService {
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

    if (channel === "sms") {
      if (organization.workspaceVerificationStatus !== "verified") {
        throw new MessageSendValidationError(
          "SMS sending requires a verified organization"
        );
      }

      if (!organization.senderId) {
        throw new MessageSendValidationError(
          "SMS sending requires an active sender ID"
        );
      }
    }

    const entitlements = PlanEntitlementsService.get(organization.planCode);
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
    } else if (units > organization.creditBalance) {
      throw new MessageInsufficientCreditsError();
    }

    await db.organization.update({
      where: { id: organizationId },
      data:
        remainingIncluded != null
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
          : {
              creditBalance: {
                decrement: units,
              },
            },
    });

    return {
      senderId: organization.senderId,
    };
  }
}
