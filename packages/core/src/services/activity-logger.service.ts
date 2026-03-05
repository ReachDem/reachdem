import { prisma, Prisma } from "@reachdem/database";
import { randomUUID } from "crypto";
import { truncate } from "../utils/pii-scrubber";
import type {
  CreateEventInput,
  CreateProviderCallInput,
  ListEventsOptions,
  ProviderSummaryResult,
} from "@reachdem/shared";

export class ActivityLogger {
  /**
   * Creates an activity event. Auto-generates correlationId if absent.
   */
  static async log(input: CreateEventInput) {
    const correlationId = input.correlationId ?? randomUUID();

    return prisma.activityEvent.create({
      data: {
        organizationId: input.organizationId,
        actorType: input.actorType ?? "system",
        actorId: input.actorId,
        category: input.category,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        provider: input.provider,
        providerRequestId: input.providerRequestId,
        correlationId,
        idempotencyKey: input.idempotencyKey,
        severity: input.severity ?? "info",
        status: input.status,
        durationMs: input.durationMs,
        meta: input.meta
          ? (input.meta as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        expiresAt: input.expiresAt,
      },
    });
  }

  /**
   * Creates a ProviderCall record linked to an ActivityEvent.
   */
  static async logProviderCall(input: CreateProviderCallInput) {
    return prisma.providerCall.create({
      data: {
        organizationId: input.organizationId,
        activityEventId: input.activityEventId,
        provider: input.provider,
        endpoint: input.endpoint,
        method: input.method.toUpperCase(),
        requestMeta: input.requestMeta
          ? (input.requestMeta as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        responseMeta: input.responseMeta
          ? (input.responseMeta as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        httpStatus: input.httpStatus,
        errorCode: input.errorCode,
        errorMessage: input.errorMessage ? truncate(input.errorMessage) : null,
        durationMs: input.durationMs,
      },
    });
  }

  /**
   * Lists activity events for a workspace with filters and cursor pagination.
   * Defaults to last 7 days. Max window: 30 days.
   */
  static async getEvents(organizationId: string, opts: ListEventsOptions = {}) {
    const limit = Math.min(opts.limit ?? 50, 100);
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const from = opts.from ?? defaultFrom;
    const to = opts.to ?? now;

    const maxWindow = 30 * 24 * 60 * 60 * 1000;
    if (to.getTime() - from.getTime() > maxWindow) {
      throw new Error("Time window cannot exceed 30 days.");
    }

    const where: Prisma.ActivityEventWhereInput = {
      organizationId,
      createdAt: { gte: from, lte: to },
      ...(opts.category && { category: opts.category }),
      ...(opts.severity && { severity: opts.severity }),
      ...(opts.status && { status: opts.status }),
      ...(opts.provider && { provider: opts.provider }),
      ...(opts.resourceId && { resourceId: opts.resourceId }),
      ...(opts.cursor && { id: { lt: opts.cursor } }),
    };

    const events = await prisma.activityEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      select: {
        id: true,
        actorType: true,
        actorId: true,
        category: true,
        action: true,
        resourceType: true,
        resourceId: true,
        provider: true,
        correlationId: true,
        severity: true,
        status: true,
        durationMs: true,
        meta: true,
        createdAt: true,
      },
    });

    const hasMore = events.length > limit;
    const items = hasMore ? events.slice(0, limit) : events;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return { items, nextCursor };
  }

  /**
   * Gets a single activity event by ID, scoped to the workspace.
   */
  static async getEventById(organizationId: string, id: string) {
    const event = await prisma.activityEvent.findFirst({
      where: { id, organizationId },
      include: { providerCalls: true },
    });

    if (!event) throw new Error("NOT_FOUND");
    return event;
  }

  /**
   * Returns aggregated provider stats for a workspace.
   */
  static async getProviderSummary(
    organizationId: string,
    from: Date,
    to: Date
  ): Promise<ProviderSummaryResult[]> {
    const maxWindow = 30 * 24 * 60 * 60 * 1000;
    if (to.getTime() - from.getTime() > maxWindow) {
      throw new Error("Time window cannot exceed 30 days.");
    }

    const results = await prisma.activityEvent.groupBy({
      by: ["provider"],
      where: {
        organizationId,
        createdAt: { gte: from, lte: to },
        provider: { not: null },
      },
      _count: { id: true },
      _avg: { durationMs: true },
    });

    const errors = await prisma.activityEvent.groupBy({
      by: ["provider"],
      where: {
        organizationId,
        createdAt: { gte: from, lte: to },
        provider: { not: null },
        status: "failed",
      },
      _count: { id: true },
    });

    const fallbacks = await prisma.activityEvent.groupBy({
      by: ["provider"],
      where: {
        organizationId,
        createdAt: { gte: from, lte: to },
        provider: { not: null },
        action: "fallback",
      },
      _count: { id: true },
    });

    return results.map((r) => ({
      provider: r.provider,
      totalCalls: r._count.id,
      avgDurationMs: r._avg.durationMs,
      errorCount:
        errors.find((e) => e.provider === r.provider)?._count?.id ?? 0,
      fallbackCount:
        fallbacks.find((f) => f.provider === r.provider)?._count?.id ?? 0,
    }));
  }
}

// Re-export types so consumers can import from @reachdem/core directly
export type {
  CreateEventInput,
  CreateProviderCallInput,
  ListEventsOptions,
  ProviderSummaryResult,
} from "@reachdem/shared";
