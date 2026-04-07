import { Prisma, prisma } from "@reachdem/database";
import { BillingCatalogService } from "./billing-catalog.service";
import { PlanEntitlementsService } from "./plan-entitlements.service";
import {
  MessageInsufficientCreditsError,
  MessageSendValidationError,
} from "../errors/messaging.errors";

type DbClient = typeof prisma | Prisma.TransactionClient;
type MessagingChannel = "sms" | "email";

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
        creditCurrency: true,
        smsQuotaUsed: true,
        smsQuotaPeriodStartedAt: true,
        emailQuotaUsed: true,
        emailQuotaPeriodStartedAt: true,
        senderId: true,
        workspaceVerificationStatus: true,
      },
    });

    if (!organization) {
      throw new MessageSendValidationError("Organization not found");
    }

    const now = new Date();
    const entitlements = PlanEntitlementsService.get(organization.planCode);
    const smsPeriodStart = startOfUtcMonth(now);
    const emailPeriodStart = startOfUtcDay(now);
    const currentUsage =
      channel === "sms"
        ? isSameInstant(organization.smsQuotaPeriodStartedAt, smsPeriodStart)
          ? organization.smsQuotaUsed
          : 0
        : isSameInstant(
              organization.emailQuotaPeriodStartedAt,
              emailPeriodStart
            )
          ? organization.emailQuotaUsed
          : 0;
    const includedLimit =
      channel === "sms"
        ? entitlements.smsIncludedLimit
        : entitlements.emailIncludedLimit;
    const includedRemaining =
      includedLimit == null ? 0 : Math.max(0, includedLimit - currentUsage);
    const billableUnits = Math.max(0, units - includedRemaining);

    const chargeAmountMinor = BillingCatalogService.calculateMessageChargeMinor(
      {
        channel,
        units: billableUnits,
        currency: organization.creditCurrency,
      }
    );

    if (chargeAmountMinor > organization.creditBalance) {
      throw new MessageInsufficientCreditsError(
        `Insufficient credit balance to send ${units} ${channel} message(s).`
      );
    }

    await db.organization.update({
      where: { id: organizationId },
      data: {
        ...(chargeAmountMinor > 0
          ? {
              creditBalance: {
                decrement: chargeAmountMinor,
              },
            }
          : {}),
        ...(channel === "sms"
          ? {
              smsQuotaPeriodStartedAt: smsPeriodStart,
              smsQuotaUsed: currentUsage + units,
            }
          : {
              emailQuotaPeriodStartedAt: emailPeriodStart,
              emailQuotaUsed: currentUsage + units,
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
