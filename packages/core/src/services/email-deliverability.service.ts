import { Prisma, prisma } from "@reachdem/database";
import { RedisCacheClient } from "../integrations/redis-cache.client";
import { MessageEventService } from "./message-event.service";

type AlibabaEventType =
  | "dm:Deliver:Succeed"
  | "dm:Deliver:Fail"
  | "dm:Trace:Open"
  | "dm:Trace:Click"
  | "dm:Feedback:FblReport"
  | "dm:Feedback:UnSubscribe"
  | "dm:Feedback:Subscribe";

interface AlibabaDirectMailEventEnvelope {
  id?: string;
  type?: string;
  source?: string;
  time?: string;
  data?: Record<string, unknown>;
}

export interface CampaignDeliverabilitySummary {
  attemptedCount: number;
  acceptedCount: number;
  deliveredCount: number;
  bouncedCount: number;
  openedCount: number;
  clickedCount: number;
  complainedCount: number;
  unsubscribedCount: number;
  resubscribedCount: number;
  totalOpenEvents: number;
  totalClickEvents: number;
}

export interface DeliverabilityIngestResult {
  processed: number;
  inserted: number;
  duplicates: number;
  ignored: number;
  unmatched: number;
}

function toEventList(payload: unknown): AlibabaDirectMailEventEnvelope[] {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is AlibabaDirectMailEventEnvelope =>
        !!item && typeof item === "object"
    );
  }

  if (payload && typeof payload === "object") {
    return [payload as AlibabaDirectMailEventEnvelope];
  }

  return [];
}

function parseDateLike(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function mapAlibabaEventType(
  type: string
):
  | "delivered"
  | "bounced"
  | "opened"
  | "clicked"
  | "complained"
  | "unsubscribed"
  | "resubscribed"
  | null {
  switch (type as AlibabaEventType) {
    case "dm:Deliver:Succeed":
      return "delivered";
    case "dm:Deliver:Fail":
      return "bounced";
    case "dm:Trace:Open":
      return "opened";
    case "dm:Trace:Click":
      return "clicked";
    case "dm:Feedback:FblReport":
      return "complained";
    case "dm:Feedback:UnSubscribe":
      return "unsubscribed";
    case "dm:Feedback:Subscribe":
      return "resubscribed";
    default:
      return null;
  }
}

function isAlibabaSource(source: unknown): boolean {
  return source === "acs:dm" || source === "acs.dm";
}

async function countDistinctMessages(where: Record<string, unknown>) {
  const grouped = await prisma.emailDeliveryEvent.groupBy({
    by: ["messageId"],
    where: {
      ...where,
      messageId: { not: null },
    },
  });

  return grouped.length;
}

export class EmailDeliverabilityService {
  private static cacheKey(campaignId: string) {
    return `campaign_stats:${campaignId}`;
  }

  static async ingestAlibabaEvents(
    payload: unknown
  ): Promise<DeliverabilityIngestResult> {
    const events = toEventList(payload);
    const result: DeliverabilityIngestResult = {
      processed: events.length,
      inserted: 0,
      duplicates: 0,
      ignored: 0,
      unmatched: 0,
    };

    const invalidatedCampaignIds = new Set<string>();

    for (const envelope of events) {
      const rawType =
        typeof envelope.type === "string" ? envelope.type.trim() : "";
      const mappedType = mapAlibabaEventType(rawType);
      const eventId =
        typeof envelope.id === "string" ? envelope.id.trim() : undefined;
      const data =
        envelope.data && typeof envelope.data === "object" ? envelope.data : {};

      if (!eventId || !mappedType || !isAlibabaSource(envelope.source)) {
        result.ignored += 1;
        continue;
      }

      const providerMessageId =
        typeof data.env_id === "string" ? data.env_id.trim() : null;
      const providerMailMessageId =
        typeof data.msg_id === "string" ? data.msg_id.trim() : null;

      const matchingAttempt = providerMessageId
        ? await prisma.messageAttempt.findFirst({
            where: {
              providerMessageId,
            },
            include: {
              message: {
                select: {
                  id: true,
                  campaignId: true,
                  organizationId: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          })
        : null;

      if (!matchingAttempt?.message) {
        result.unmatched += 1;
        continue;
      }

      const occurredAt =
        parseDateLike(data.operate_time) ||
        parseDateLike(data.deliver_time) ||
        parseDateLike(data.send_time) ||
        parseDateLike(envelope.time) ||
        new Date();

      try {
        await prisma.$transaction(async (tx) => {
          await tx.emailDeliveryEvent.create({
            data: {
              organizationId: matchingAttempt.message.organizationId,
              campaignId: matchingAttempt.message.campaignId,
              messageId: matchingAttempt.message.id,
              messageAttemptId: matchingAttempt.id,
              provider: matchingAttempt.provider,
              providerEventId: eventId,
              providerEventType: rawType,
              providerMessageId,
              providerMailMessageId,
              eventType: mappedType,
              recipientEmail:
                typeof data.rcpt === "string" ? data.rcpt.trim() : null,
              senderEmail:
                typeof data.from === "string" ? data.from.trim() : null,
              url: typeof data.url === "string" ? data.url.trim() : null,
              userAgent:
                typeof data.user_agent === "string"
                  ? data.user_agent.trim()
                  : null,
              clientIp:
                typeof data.client_ip === "string"
                  ? data.client_ip.trim()
                  : null,
              errorCode:
                typeof data.err_code === "string" ? data.err_code.trim() : null,
              errorMessage:
                typeof data.err_msg === "string" ? data.err_msg.trim() : null,
              failureType:
                typeof data.failed_type === "string"
                  ? data.failed_type.trim()
                  : null,
              providerTag:
                typeof data.tag === "string" ? data.tag.trim() : null,
              rawPayload: envelope as Prisma.InputJsonValue,
              occurredAt,
            },
          });

          if (mappedType === "bounced") {
            await tx.message.updateMany({
              where: {
                id: matchingAttempt.message.id,
                channel: "email",
              },
              data: {
                status: "failed",
              },
            });

            await tx.campaignTarget.updateMany({
              where: {
                messageId: matchingAttempt.message.id,
              },
              data: {
                status: "failed",
              },
            });

            await MessageEventService.recordWithWebhookDelivery(tx, {
              organizationId: matchingAttempt.message.organizationId,
              messageId: matchingAttempt.message.id,
              type: "message.failed",
              status: "failed",
              payload: {
                providerEventType: rawType,
                eventType: mappedType,
                providerMessageId,
              },
            });
          }

          if (mappedType === "delivered") {
            await tx.message.updateMany({
              where: {
                id: matchingAttempt.message.id,
                channel: "email",
              },
              data: {
                status: "sent",
              },
            });

            await tx.campaignTarget.updateMany({
              where: {
                messageId: matchingAttempt.message.id,
              },
              data: {
                status: "sent",
              },
            });

            await MessageEventService.recordWithWebhookDelivery(tx, {
              organizationId: matchingAttempt.message.organizationId,
              messageId: matchingAttempt.message.id,
              type: "message.delivered",
              status: "sent",
              payload: {
                providerEventType: rawType,
                eventType: mappedType,
                providerMessageId,
              },
            });
          }
        });

        result.inserted += 1;

        if (matchingAttempt.message.campaignId) {
          invalidatedCampaignIds.add(matchingAttempt.message.campaignId);
        }
      } catch (error) {
        const code =
          typeof error === "object" &&
          error &&
          "code" in error &&
          typeof (error as { code?: unknown }).code === "string"
            ? (error as { code: string }).code
            : null;

        if (code === "P2002") {
          result.duplicates += 1;
          continue;
        }

        throw error;
      }
    }

    await Promise.all(
      Array.from(invalidatedCampaignIds).map((campaignId) =>
        RedisCacheClient.del(this.cacheKey(campaignId))
      )
    );

    return result;
  }

  static async getCampaignSummary(
    organizationId: string,
    campaignId: string
  ): Promise<CampaignDeliverabilitySummary> {
    const attemptedCount = await prisma.message.count({
      where: {
        organizationId,
        campaignId,
        channel: "email",
      },
    });

    const acceptedMessageIds = await prisma.messageAttempt.findMany({
      where: {
        organizationId,
        status: "sent",
        message: {
          campaignId,
          channel: "email",
        },
      },
      distinct: ["messageId"],
      select: {
        messageId: true,
      },
    });

    const [deliveredCount, bouncedCount, openedCount, clickedCount] =
      await Promise.all([
        countDistinctMessages({
          organizationId,
          campaignId,
          eventType: "delivered",
        }),
        countDistinctMessages({
          organizationId,
          campaignId,
          eventType: "bounced",
        }),
        countDistinctMessages({
          organizationId,
          campaignId,
          eventType: "opened",
        }),
        countDistinctMessages({
          organizationId,
          campaignId,
          eventType: "clicked",
        }),
      ]);

    const [
      complainedCount,
      unsubscribedCount,
      resubscribedCount,
      totalOpenEvents,
      totalClickEvents,
    ] = await Promise.all([
      countDistinctMessages({
        organizationId,
        campaignId,
        eventType: "complained",
      }),
      countDistinctMessages({
        organizationId,
        campaignId,
        eventType: "unsubscribed",
      }),
      countDistinctMessages({
        organizationId,
        campaignId,
        eventType: "resubscribed",
      }),
      prisma.emailDeliveryEvent.count({
        where: {
          organizationId,
          campaignId,
          eventType: "opened",
        },
      }),
      prisma.emailDeliveryEvent.count({
        where: {
          organizationId,
          campaignId,
          eventType: "clicked",
        },
      }),
    ]);

    return {
      attemptedCount,
      acceptedCount: acceptedMessageIds.length,
      deliveredCount,
      bouncedCount,
      openedCount,
      clickedCount,
      complainedCount,
      unsubscribedCount,
      resubscribedCount,
      totalOpenEvents,
      totalClickEvents,
    };
  }
}
