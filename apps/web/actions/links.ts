"use server";

import { headers } from "next/headers";
import { auth } from "@reachdem/auth";
import { TrackedLinkService } from "@reachdem/core";
import { SinkClient } from "@reachdem/core";
import { CampaignStatsService } from "@reachdem/core";
import type { CreateTrackedLinkDto } from "@reachdem/shared";

export interface CreateTrackedLinkInput {
  targetUrl: string;
  slug?: string;
  campaignId?: string;
  channel?: "sms" | "email";
  comment?: string;
}

export interface TrackedLink {
  id: string;
  slug: string;
  shortUrl: string;
  targetUrl: string;
  campaignId: string | null;
  channel: string | null;
  totalClicks: number | null;
  uniqueClicks: number | null;
  createdAt: Date;
}

interface DailyBucket {
  date: string;
  total: number;
  byLink: Record<string, number>;
  byBrowser: Record<string, number>;
  byDevice: Record<string, number>;
}

interface VisitorBucket {
  total: number;
  byRegion: Map<string, number>;
  byCity: Map<string, number>;
  byGender: Map<string, number>;
}

function toIsoDay(date: Date): string {
  return date.toISOString().split("T")[0];
}

function buildRollingDailyBuckets(days: number) {
  const buckets = new Map<string, DailyBucket>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let index = days - 1; index >= 0; index--) {
    const day = new Date(today);
    day.setDate(today.getDate() - index);
    const isoDay = toIsoDay(day);

    buckets.set(isoDay, {
      date: isoDay,
      total: 0,
      byLink: {},
      byBrowser: {},
      byDevice: {},
    });
  }

  return buckets;
}

async function getOrganizationId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) throw new Error("Unauthorized");

  const organizationId = session.session?.activeOrganizationId;
  if (!organizationId) throw new Error("Organization selection required");

  return { organizationId };
}

export async function createTrackedLink(
  input: CreateTrackedLinkInput
): Promise<TrackedLink> {
  const { organizationId } = await getOrganizationId();

  const link = await TrackedLinkService.createLink(
    organizationId,
    input as CreateTrackedLinkDto
  );

  return {
    id: link.id,
    slug: link.slug,
    shortUrl: link.shortUrl,
    targetUrl: link.targetUrl,
    campaignId: link.campaignId,
    channel: link.channel,
    totalClicks: link.totalClicks,
    uniqueClicks: link.uniqueClicks,
    createdAt: link.createdAt,
  };
}

export async function getCampaignAnalytics(campaignId: string): Promise<any> {
  const { organizationId } = await getOrganizationId();
  const campaignStats = await CampaignStatsService.getCampaignStats(
    organizationId,
    campaignId
  ).catch(() => null);

  // Get all links for this campaign
  const linksResult = await TrackedLinkService.listLinks(organizationId, {
    campaignId,
    limit: 100,
  });

  if (linksResult.items.length === 0) {
    const emptyDailyVisits = Array.from(buildRollingDailyBuckets(7).values());

    return {
      dailyVisits: emptyDailyVisits,
      visitors: {
        total: 0,
        byRegion: {},
        byCity: {},
        byGender: {},
      },
      links: [],
      linkAnalytics: {},
      deliverability: campaignStats?.deliverability ?? null,
    };
  }

  // Get campaign targets to cross-reference contact data
  const { prisma } = await import("@reachdem/database");
  const targets = await prisma.campaignTarget.findMany({
    where: {
      campaignId,
      organizationId,
    },
    include: {
      contact: {
        select: {
          id: true,
          gender: true,
        },
      },
    },
  });

  // Create a map of contactId -> gender for cross-referencing
  const contactGenderMap = new Map<string, string>();
  targets.forEach((t) => {
    if (t.contact.gender) {
      contactGenderMap.set(t.contactId, t.contact.gender);
    }
  });

  // Get stats for each link from Sink
  const linkStats = await Promise.all(
    linksResult.items.map(async (link) => {
      try {
        // Get views by day and metrics by browser/device/region/city
        const [
          views,
          browserMetrics,
          deviceMetrics,
          regionMetrics,
          cityMetrics,
        ] = await Promise.all([
          SinkClient.getViewsBySlug(link.slug),
          SinkClient.getMetricsBySlug(link.slug, "browser", "day").catch(
            () => ({ data: [] })
          ),
          SinkClient.getMetricsBySlug(link.slug, "device", "day").catch(() => ({
            data: [],
          })),
          SinkClient.getMetricsBySlug(link.slug, "region", "day").catch(() => ({
            data: [],
          })),
          SinkClient.getMetricsBySlug(link.slug, "city", "day").catch(() => ({
            data: [],
          })),
        ]);

        console.log(`[Analytics] Link ${link.slug} raw data:`, {
          viewsCount: views?.data?.length,
          browsersCount: browserMetrics?.data?.length,
          devicesCount: deviceMetrics?.data?.length,
          regionsCount: regionMetrics?.data?.length,
          citiesCount: cityMetrics?.data?.length,
          firstView: views?.data?.[0],
          firstBrowser: browserMetrics?.data?.[0],
          firstDevice: deviceMetrics?.data?.[0],
          firstRegion: regionMetrics?.data?.[0],
          firstCity: cityMetrics?.data?.[0],
        });

        return {
          link,
          views,
          browserMetrics,
          deviceMetrics,
          regionMetrics,
          cityMetrics,
        };
      } catch (error) {
        console.error(`Failed to get stats for link ${link.slug}:`, error);
        return {
          link,
          views: null,
          browserMetrics: null,
          deviceMetrics: null,
          regionMetrics: null,
          cityMetrics: null,
        };
      }
    })
  );

  // Transform data for charts
  const dailyVisitsMap = buildRollingDailyBuckets(7);
  const perLinkDailyVisitsMap = new Map<string, Map<string, DailyBucket>>();
  const perLinkVisitorsMap = new Map<string, VisitorBucket>();
  let totalVisitors = 0;
  const regionMap = new Map<string, number>();
  const cityMap = new Map<string, number>();
  const genderMap = new Map<string, number>();

  // First pass: collect all daily visits and link data
  for (const stat of linkStats) {
    if (!stat.views?.data) continue;

    if (!perLinkDailyVisitsMap.has(stat.link.slug)) {
      perLinkDailyVisitsMap.set(stat.link.slug, buildRollingDailyBuckets(7));
    }
    if (!perLinkVisitorsMap.has(stat.link.slug)) {
      perLinkVisitorsMap.set(stat.link.slug, {
        total: 0,
        byRegion: new Map(),
        byCity: new Map(),
        byGender: new Map(),
      });
    }

    const linkBuckets = perLinkDailyVisitsMap.get(stat.link.slug)!;
    const linkVisitors = perLinkVisitorsMap.get(stat.link.slug)!;

    for (const view of stat.views.data) {
      const date = view.time || view.date || toIsoDay(new Date());
      const visits = Number(view.visits || 0);
      const visitors = Number(view.visitors || 0);

      const dayData = dailyVisitsMap.get(date);
      const linkDayData = linkBuckets.get(date);
      if (!dayData || !linkDayData) continue;
      dayData.total += visits;
      dayData.byLink[stat.link.slug] =
        (dayData.byLink[stat.link.slug] || 0) + visits;
      linkDayData.total += visits;

      totalVisitors += visitors;
      linkVisitors.total += visitors;

      // Aggregate location data
      if (view.region) {
        regionMap.set(
          view.region,
          (regionMap.get(view.region) || 0) + visitors
        );
        linkVisitors.byRegion.set(
          view.region,
          (linkVisitors.byRegion.get(view.region) || 0) + visitors
        );
      }
      if (view.city) {
        cityMap.set(view.city, (cityMap.get(view.city) || 0) + visitors);
        linkVisitors.byCity.set(
          view.city,
          (linkVisitors.byCity.get(view.city) || 0) + visitors
        );
      }

      // Cross-reference gender data from contact
      if (view.contactId) {
        const gender = contactGenderMap.get(view.contactId);
        if (gender) {
          genderMap.set(gender, (genderMap.get(gender) || 0) + visitors);
          linkVisitors.byGender.set(
            gender,
            (linkVisitors.byGender.get(gender) || 0) + visitors
          );
        }
      } else if (view.gender) {
        genderMap.set(
          view.gender,
          (genderMap.get(view.gender) || 0) + visitors
        );
        linkVisitors.byGender.set(
          view.gender,
          (linkVisitors.byGender.get(view.gender) || 0) + visitors
        );
      }
    }
  }

  // Second pass: distribute browser and device metrics across days
  for (const stat of linkStats) {
    const linkBuckets = perLinkDailyVisitsMap.get(stat.link.slug);
    const linkVisitors = perLinkVisitorsMap.get(stat.link.slug);
    if (!linkBuckets) continue;

    // Calculate total visits for this link across all days
    const linkTotalVisits = Array.from(linkBuckets.values()).reduce(
      (sum, day) => sum + day.total,
      0
    );

    if (linkTotalVisits === 0) continue;

    // Process browser metrics (aggregated totals, need to distribute)
    if (stat.browserMetrics?.data && stat.browserMetrics.data.length > 0) {
      for (const metric of stat.browserMetrics.data) {
        const browser = metric.name || metric.browser || "Unknown";
        const metricCount = Number(
          metric.count || metric.visits || metric.value || 0
        );

        // Distribute this browser's visits proportionally across days
        for (const dayData of dailyVisitsMap.values()) {
          const linkDayData = linkBuckets.get(dayData.date);
          const linkVisitsForDay = linkDayData?.total || 0;
          const proportion = linkVisitsForDay / linkTotalVisits;
          const browserVisitsForDay = Math.round(metricCount * proportion);

          if (browserVisitsForDay > 0) {
            dayData.byBrowser[browser] =
              (dayData.byBrowser[browser] || 0) + browserVisitsForDay;
            if (linkDayData) {
              linkDayData.byBrowser[browser] =
                (linkDayData.byBrowser[browser] || 0) + browserVisitsForDay;
            }
          }
        }
      }
    }

    // Process device metrics (aggregated totals, need to distribute)
    if (stat.deviceMetrics?.data && stat.deviceMetrics.data.length > 0) {
      for (const metric of stat.deviceMetrics.data) {
        const device = metric.name || metric.device || "Unknown";
        const metricCount = Number(
          metric.count || metric.visits || metric.value || 0
        );

        // Distribute this device's visits proportionally across days
        for (const dayData of dailyVisitsMap.values()) {
          const linkDayData = linkBuckets.get(dayData.date);
          const linkVisitsForDay = linkDayData?.total || 0;
          const proportion = linkVisitsForDay / linkTotalVisits;
          const deviceVisitsForDay = Math.round(metricCount * proportion);

          if (deviceVisitsForDay > 0) {
            dayData.byDevice[device] =
              (dayData.byDevice[device] || 0) + deviceVisitsForDay;
            if (linkDayData) {
              linkDayData.byDevice[device] =
                (linkDayData.byDevice[device] || 0) + deviceVisitsForDay;
            }
          }
        }
      }
    }

    // Process region metrics (aggregated totals for pie chart)
    if (stat.regionMetrics?.data && stat.regionMetrics.data.length > 0) {
      for (const metric of stat.regionMetrics.data) {
        const region = metric.name || metric.region || "Unknown";
        const metricCount = Number(
          metric.count || metric.visitors || metric.value || 0
        );
        regionMap.set(region, (regionMap.get(region) || 0) + metricCount);
        if (linkVisitors) {
          linkVisitors.byRegion.set(
            region,
            Math.max(linkVisitors.byRegion.get(region) || 0, metricCount)
          );
        }
      }
    }

    // Process city metrics (aggregated totals for pie chart)
    if (stat.cityMetrics?.data && stat.cityMetrics.data.length > 0) {
      for (const metric of stat.cityMetrics.data) {
        const city = metric.name || metric.city || "Unknown";
        const metricCount = Number(
          metric.count || metric.visitors || metric.value || 0
        );
        cityMap.set(city, (cityMap.get(city) || 0) + metricCount);
        if (linkVisitors) {
          linkVisitors.byCity.set(
            city,
            Math.max(linkVisitors.byCity.get(city) || 0, metricCount)
          );
        }
      }
    }
  }

  console.log(
    "[Analytics] Final dailyVisitsMap:",
    Array.from(dailyVisitsMap.values())
  );

  // Convert to arrays and sort
  const dailyVisits = Array.from(dailyVisitsMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const linkAnalytics = Object.fromEntries(
    linksResult.items.map((link) => {
      const buckets =
        perLinkDailyVisitsMap.get(link.slug) ?? buildRollingDailyBuckets(7);

      return [
        link.slug,
        {
          dailyVisits: Array.from(buckets.values()).sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          ),
          visitors: {
            total: perLinkVisitorsMap.get(link.slug)?.total || 0,
            byRegion: Object.fromEntries(
              perLinkVisitorsMap.get(link.slug)?.byRegion ?? new Map()
            ),
            byCity: Object.fromEntries(
              perLinkVisitorsMap.get(link.slug)?.byCity ?? new Map()
            ),
            byGender: Object.fromEntries(
              perLinkVisitorsMap.get(link.slug)?.byGender ?? new Map()
            ),
          },
        },
      ];
    })
  );

  return {
    dailyVisits,
    visitors: {
      total: totalVisitors,
      byRegion: Object.fromEntries(regionMap),
      byCity: Object.fromEntries(cityMap),
      byGender: Object.fromEntries(genderMap),
    },
    links: linksResult.items.map((l) => ({
      id: l.id,
      slug: l.slug,
      shortUrl: l.shortUrl,
    })),
    linkAnalytics,
    deliverability: campaignStats?.deliverability ?? null,
  };
}
