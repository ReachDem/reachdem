import { prisma } from "@reachdem/database";
import type { CampaignStatsResponse } from "@reachdem/shared";
import { CampaignNotFoundError } from "../errors/campaign.errors";
import { SinkClient } from "../integrations/sink.client";
import { RedisCacheClient } from "../integrations/redis-cache.client";

const CAMPAIGN_STATS_TTL_SECONDS = 60;

export class CampaignStatsService {
  private static cacheKey(campaignId: string) {
    return `campaign_stats:${campaignId}`;
  }

  static async invalidate(
    campaignId: string | null | undefined
  ): Promise<void> {
    if (!campaignId) return;
    await RedisCacheClient.del(this.cacheKey(campaignId));
  }

  static async getCampaignStats(
    organizationId: string,
    campaignId: string
  ): Promise<CampaignStatsResponse> {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    if (!campaign) {
      throw new CampaignNotFoundError();
    }

    const cacheKey = this.cacheKey(campaignId);
    const cached =
      await RedisCacheClient.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      const stats = cached as unknown as CampaignStatsResponse;
      return stats;
    }

    const groupedTargets = await prisma.campaignTarget.groupBy({
      by: ["status"],
      where: { campaignId, organizationId },
      _count: { _all: true },
    });

    const counts = new Map(
      groupedTargets.map((item) => [item.status, item._count._all])
    );

    const trackedLinks = await prisma.trackedLink.findMany({
      where: { campaignId, organizationId, status: "active" },
      select: {
        id: true,
        slug: true,
      },
    });

    let clickCount = 0;
    let uniqueClickCount = 0;

    for (const link of trackedLinks) {
      const counters = await SinkClient.getCountersBySlug(link.slug);
      clickCount += counters.totalClicks;
      uniqueClickCount += counters.uniqueClicks;

      await prisma.trackedLink.update({
        where: { id: link.id },
        data: {
          totalClicks: counters.totalClicks,
          uniqueClicks: counters.uniqueClicks,
          lastStatsSyncAt: new Date(),
        },
      });
    }

    const stats: CampaignStatsResponse = {
      campaignId,
      audienceSize:
        (counts.get("pending") ?? 0) +
        (counts.get("sent") ?? 0) +
        (counts.get("failed") ?? 0) +
        (counts.get("skipped") ?? 0),
      pendingCount: counts.get("pending") ?? 0,
      sentCount: counts.get("sent") ?? 0,
      failedCount: counts.get("failed") ?? 0,
      skippedCount: counts.get("skipped") ?? 0,
      clickCount,
      uniqueClickCount,
      resolvedStatus:
        campaign.status as CampaignStatsResponse["resolvedStatus"],
    };

    const resolvedStatus = this.deriveResolvedStatus({
      currentStatus: campaign.status as CampaignStatsResponse["resolvedStatus"],
      updatedAt: campaign.updatedAt,
      audienceSize: stats.audienceSize,
      pendingCount: stats.pendingCount,
      sentCount: stats.sentCount,
      failedCount: stats.failedCount,
      skippedCount: stats.skippedCount,
    });

    if (resolvedStatus !== campaign.status) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: resolvedStatus as any },
      });
    }

    stats.resolvedStatus = resolvedStatus;

    await RedisCacheClient.set(
      cacheKey,
      stats as unknown as Record<string, unknown>,
      CAMPAIGN_STATS_TTL_SECONDS
    );

    return stats;
  }

  private static deriveResolvedStatus(input: {
    currentStatus: CampaignStatsResponse["resolvedStatus"];
    updatedAt: Date;
    audienceSize: number;
    pendingCount: number;
    sentCount: number;
    failedCount: number;
    skippedCount: number;
  }): CampaignStatsResponse["resolvedStatus"] {
    if (input.currentStatus === "draft") {
      return "draft";
    }

    const unsuccessfulCount = input.failedCount + input.skippedCount;
    const isOlderThanTwoDays =
      Date.now() - input.updatedAt.getTime() > 2 * 24 * 60 * 60 * 1000;

    let nextStatus = input.currentStatus;

    if (input.pendingCount > 0) {
      nextStatus = "running";
    } else if (
      input.audienceSize > 0 &&
      input.sentCount === input.audienceSize
    ) {
      nextStatus = "completed";
    } else if (
      input.audienceSize > 0 &&
      input.sentCount === 0 &&
      unsuccessfulCount === input.audienceSize
    ) {
      nextStatus = "failed";
    } else if (input.sentCount > 0 && unsuccessfulCount > 0) {
      nextStatus = "partial";
    }

    if (
      isOlderThanTwoDays &&
      (nextStatus === "failed" || nextStatus === "partial")
    ) {
      return "expired";
    }

    return nextStatus;
  }
}
