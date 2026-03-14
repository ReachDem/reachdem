import { prisma, Prisma } from "@reachdem/database";
import type { ListMessagesOptions } from "@reachdem/shared";

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
}
