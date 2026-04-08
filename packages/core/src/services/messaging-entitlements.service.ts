import { Prisma, prisma } from "@reachdem/database";
import { BillingRecordService } from "./billing-record.service";
import { PlanEntitlementsService } from "./plan-entitlements.service";
import { BillingInsufficientCreditsError } from "../errors/billing.errors";
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
    units = 1,
    options: {
      apiKeyId?: string | null;
      messageId?: string | null;
      campaignId?: string | null;
      source?: "dashboard" | "publicApi" | "worker" | "system";
    } = {}
  ): Promise<{ senderId: string | null }> {
    // This service is called from write transactions. The row lock keeps
    // quota calculation, wallet debit, and quota usage update consistent.
    await db.$queryRaw(
      Prisma.sql`SELECT "id" FROM "organization" WHERE "id" = ${organizationId} FOR UPDATE`
    );

    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        planCode: true,
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
    const isCurrentSmsPeriod = isSameInstant(
      organization.smsQuotaPeriodStartedAt,
      smsPeriodStart
    );
    const isCurrentEmailPeriod = isSameInstant(
      organization.emailQuotaPeriodStartedAt,
      emailPeriodStart
    );
    const currentUsage =
      channel === "sms"
        ? isCurrentSmsPeriod
          ? organization.smsQuotaUsed
          : 0
        : isCurrentEmailPeriod
          ? organization.emailQuotaUsed
          : 0;
    const includedLimit =
      channel === "sms"
        ? entitlements.smsIncludedLimit
        : entitlements.emailIncludedLimit;
    const includedRemaining =
      includedLimit == null ? 0 : Math.max(0, includedLimit - currentUsage);
    const billableUnits = Math.max(0, units - includedRemaining);

    if (billableUnits > 0) {
      try {
        await BillingRecordService.billMessageUsage(db, {
          organizationId,
          apiKeyId: options.apiKeyId ?? null,
          channel,
          units: billableUnits,
          messageId: options.messageId ?? null,
          campaignId: options.campaignId ?? null,
          source: options.source ?? "dashboard",
        });
      } catch (error) {
        if (error instanceof BillingInsufficientCreditsError) {
          throw new MessageInsufficientCreditsError(
            `Insufficient credit balance to send ${units} ${channel} message(s).`
          );
        }
        throw error;
      }
    }

    await db.organization.update({
      where: { id: organizationId },
      data: {
        ...(channel === "sms"
          ? {
              smsQuotaPeriodStartedAt: smsPeriodStart,
              smsQuotaUsed: isCurrentSmsPeriod ? { increment: units } : units,
            }
          : {
              emailQuotaPeriodStartedAt: emailPeriodStart,
              emailQuotaUsed: isCurrentEmailPeriod
                ? { increment: units }
                : units,
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
