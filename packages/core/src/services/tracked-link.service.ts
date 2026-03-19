import { prisma, Prisma } from "@reachdem/database";
import type {
  CreateTrackedLinkDto,
  ListTrackedLinksQuery,
  TrackedLinkResponse,
  TrackedLinkStatsResponse,
  UpdateTrackedLinkDto,
} from "@reachdem/shared";
import { SinkClient } from "../integrations/sink.client";

export class TrackedLinkNotFoundError extends Error {
  constructor() {
    super("Tracked link not found");
    this.name = "TrackedLinkNotFoundError";
  }
}

export class TrackedLinkService {
  private static toResponse(link: any): TrackedLinkResponse {
    return {
      id: link.id,
      organizationId: link.organizationId,
      sinkLinkId: link.sinkLinkId,
      slug: link.slug,
      shortUrl: link.shortUrl,
      targetUrl: link.targetUrl,
      campaignId: link.campaignId ?? null,
      messageId: link.messageId ?? null,
      contactId: link.contactId ?? null,
      channel: link.channel ?? null,
      status: link.status,
      totalClicks: link.totalClicks ?? null,
      uniqueClicks: link.uniqueClicks ?? null,
      lastStatsSyncAt: link.lastStatsSyncAt ?? null,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
    };
  }

  static async createLink(
    organizationId: string,
    data: CreateTrackedLinkDto
  ): Promise<TrackedLinkResponse> {
    const created = await SinkClient.createLink({
      url: data.targetUrl,
      slug: data.slug,
      comment: data.comment,
    });

    const link = await prisma.trackedLink.create({
      data: {
        organizationId,
        sinkLinkId: created.id,
        slug: created.slug,
        shortUrl: `${process.env.SINK_PUBLIC_BASE_URL ?? process.env.SINK_API_BASE_URL ?? "https://rcdm.ink"}/${created.slug}`,
        targetUrl: created.url,
        campaignId: data.campaignId ?? null,
        messageId: data.messageId ?? null,
        contactId: data.contactId ?? null,
        channel: data.channel ?? null,
      },
    });

    return this.toResponse(link);
  }

  static async listLinks(
    organizationId: string,
    opts: ListTrackedLinksQuery = {}
  ) {
    const limit = Math.min(opts.limit ?? 50, 100);
    const where: Prisma.TrackedLinkWhereInput = {
      organizationId,
      ...(opts.campaignId && { campaignId: opts.campaignId }),
      ...(opts.messageId && { messageId: opts.messageId }),
      ...(opts.contactId && { contactId: opts.contactId }),
    };

    const links = await prisma.trackedLink.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    });

    const hasMore = links.length > limit;
    const items = hasMore ? links.slice(0, limit) : links;

    return {
      items: items.map((item) => this.toResponse(item)),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  }

  static async getLinkById(
    organizationId: string,
    id: string
  ): Promise<TrackedLinkResponse> {
    const link = await prisma.trackedLink.findFirst({
      where: { id, organizationId },
    });

    if (!link) {
      throw new TrackedLinkNotFoundError();
    }

    return this.toResponse(link);
  }

  static async updateLink(
    organizationId: string,
    id: string,
    data: UpdateTrackedLinkDto
  ): Promise<TrackedLinkResponse> {
    const existing = await prisma.trackedLink.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new TrackedLinkNotFoundError();
    }

    if (data.targetUrl) {
      const updatedRemote = await SinkClient.editLink({
        slug: existing.slug,
        url: data.targetUrl,
      });

      const updated = await prisma.trackedLink.update({
        where: { id: existing.id },
        data: {
          targetUrl: updatedRemote.url,
        },
      });

      return this.toResponse(updated);
    }

    if (data.status === "disabled" && existing.status !== "disabled") {
      await SinkClient.deleteLink(existing.slug);
    }

    const updated = await prisma.trackedLink.update({
      where: { id: existing.id },
      data: {
        ...(data.status ? { status: data.status } : {}),
      },
    });

    return this.toResponse(updated);
  }

  static async refreshLinkStats(
    organizationId: string,
    id: string
  ): Promise<TrackedLinkStatsResponse> {
    const existing = await prisma.trackedLink.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new TrackedLinkNotFoundError();
    }

    const counters = await SinkClient.getCountersBySlug(existing.slug);
    const updated = await prisma.trackedLink.update({
      where: { id: existing.id },
      data: {
        totalClicks: counters.totalClicks,
        uniqueClicks: counters.uniqueClicks,
        lastStatsSyncAt: new Date(),
      },
    });

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      totalClicks: updated.totalClicks ?? null,
      uniqueClicks: updated.uniqueClicks ?? null,
      lastStatsSyncAt: updated.lastStatsSyncAt ?? null,
    };
  }
}
