import { prisma, Prisma } from "@reachdem/database";
import type { ListMessagesOptions, MessageStatus } from "@reachdem/shared";

export class MessageService {
  /**
   * Returns paginated messages for a workspace.
   */
  static async listMessages(
    organizationId: string,
    opts: ListMessagesOptions = {}
  ) {
    const limit = Math.min(opts.limit ?? 50, 100);

    const where: Prisma.MessageWhereInput = {
      organizationId,
      ...(opts.status && { status: opts.status }),
      ...(opts.from || opts.to
        ? {
            createdAt: {
              ...(opts.from && { gte: opts.from }),
              ...(opts.to && { lte: opts.to }),
            },
          }
        : {}),
    };

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(opts.cursor && { cursor: { id: opts.cursor }, skip: 1 }),
      select: {
        id: true,
        campaignId: true,
        channel: true,
        toLast4: true,
        from: true,
        status: true,
        providerSelected: true,
        correlationId: true,
        idempotencyKey: true,
        scheduledAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  /**
   * Returns a single message with all its attempts, workspace-scoped.
   */
  static async getMessageById(organizationId: string, id: string) {
    const message = await prisma.message.findFirst({
      where: { id, organizationId },
      include: {
        attempts: {
          orderBy: { attemptNo: "asc" },
        },
      },
    });

    if (!message) throw new Error("NOT_FOUND");
    return message;
  }

  static async listScheduledMessages(until: Date) {
    return prisma.message.findMany({
      where: {
        status: "scheduled",
        scheduledAt: {
          not: null,
          lte: until,
        },
      },
      orderBy: { scheduledAt: "asc" },
      select: {
        id: true,
        organizationId: true,
        channel: true,
      },
    });
  }

  static async updateMessageStatuses(ids: string[], status: MessageStatus) {
    if (ids.length === 0) return { count: 0, ids: [] as string[] };

    if (status === "queued") {
      return prisma.$transaction(async (tx) => {
        const scheduledMessages = await tx.message.findMany({
          where: {
            id: { in: ids },
            status: "scheduled",
          },
          select: { id: true },
        });

        const scheduledIds = scheduledMessages.map((message) => message.id);
        if (scheduledIds.length === 0) {
          return { count: 0, ids: [] as string[] };
        }

        await tx.message.updateMany({
          where: {
            id: { in: scheduledIds },
            status: "scheduled",
          },
          data: {
            status: "queued",
          },
        });

        return { count: scheduledIds.length, ids: scheduledIds };
      });
    }

    const result = await prisma.message.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        status,
      },
    });

    return { count: result.count, ids };
  }
}
