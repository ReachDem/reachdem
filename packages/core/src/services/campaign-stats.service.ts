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
      select: { id: true },
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
      sentCount: counts.get("sent") ?? 0,
      failedCount: counts.get("failed") ?? 0,
      clickCount,
      uniqueClickCount,
    };

    await RedisCacheClient.set(
      cacheKey,
      stats as unknown as Record<string, unknown>,
      CAMPAIGN_STATS_TTL_SECONDS
    );

    return stats;
  }
}
