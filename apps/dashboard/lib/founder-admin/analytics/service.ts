import { BillingCatalogService } from "@reachdem/core";
import { prisma } from "@reachdem/database";
import { founderAdminAnalyticsFixtures } from "@/fixtures/founder-admin";
import {
  addDays,
  createCurrentMonthRange,
  createTrailingRange,
  formatDateKey,
  isWithinRange,
} from "@/lib/founder-admin/shared/date";
import { sum } from "@/lib/founder-admin/shared/math";
import type {
  CustomerAcquisitionSnapshot,
  FounderAdminDataSource,
  FounderAdminDateRange,
  OverviewMetrics,
  RevenueSnapshot,
  VisitorPoint,
} from "@/lib/founder-admin/types";
import {
  PostHogAdminError,
  createPostHogAdminClient,
  getPostHogAdminConfigFromEnv,
} from "@/lib/posthog-admin";

interface AnalyticsOrganizationRecord {
  id: string;
  planCode: string;
  creditBalance: number;
  createdAt: Date;
}

interface SuccessfulPaymentRecord {
  id: string;
  organizationId: string;
  amountMinor: number;
  currency: string;
  succeededAt: Date;
}

interface SignificantActivityRecord {
  organizationId: string;
  occurredAt: Date;
}

export interface AnalyticsBusinessSource {
  listOrganizations(): Promise<AnalyticsOrganizationRecord[]>;
  listSuccessfulPaymentsThrough(
    cutoff: Date
  ): Promise<SuccessfulPaymentRecord[]>;
  listSignificantActivities(
    range: FounderAdminDateRange
  ): Promise<SignificantActivityRecord[]>;
}

export interface AnalyticsVisitorsSource {
  getDailyUniqueVisitors(range: FounderAdminDateRange): Promise<{
    points: VisitorPoint[];
    source: FounderAdminDataSource;
  }>;
}

export interface AnalyticsServiceOptions {
  asOf?: Date;
  businessSource?: AnalyticsBusinessSource;
  visitorsSource?: AnalyticsVisitorsSource;
  useMockFallback?: boolean;
}

function hasDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL || process.env.PRISMA_ACCELERATE_URL);
}

export function createMockAnalyticsBusinessSource(
  seed = founderAdminAnalyticsFixtures
): AnalyticsBusinessSource {
  return {
    async listOrganizations() {
      return seed.organizations.map((organization) => ({
        id: organization.id,
        planCode: organization.planCode,
        creditBalance: organization.creditBalance,
        createdAt: organization.createdAt,
      }));
    },
    async listSuccessfulPaymentsThrough(cutoff) {
      return seed.payments
        .filter((payment) => payment.succeededAt <= cutoff)
        .map((payment) => ({
          id: payment.id,
          organizationId: payment.organizationId,
          amountMinor: payment.amountMinor,
          currency: payment.currency,
          succeededAt: payment.succeededAt,
        }));
    },
    async listSignificantActivities(range) {
      return seed.activities
        .filter((activity) => isWithinRange(activity.occurredAt, range))
        .map((activity) => ({
          organizationId: activity.organizationId,
          occurredAt: activity.occurredAt,
        }));
    },
  };
}

export function createPrismaAnalyticsBusinessSource(): AnalyticsBusinessSource {
  return {
    async listOrganizations() {
      const organizations = await prisma.organization.findMany({
        select: {
          id: true,
          planCode: true,
          creditBalance: true,
          createdAt: true,
        },
      });

      return organizations.map(
        (organization: {
          id: string;
          planCode: string;
          creditBalance: number;
          createdAt: Date;
        }) => ({
          id: organization.id,
          planCode: organization.planCode,
          creditBalance: organization.creditBalance,
          createdAt: organization.createdAt,
        })
      );
    },
    async listSuccessfulPaymentsThrough(cutoff) {
      const payments = await prisma.paymentTransaction.findMany({
        where: {
          status: "succeeded",
          OR: [
            {
              confirmedAt: {
                lte: cutoff,
              },
            },
            {
              confirmedAt: null,
              createdAt: {
                lte: cutoff,
              },
            },
          ],
        },
        select: {
          id: true,
          organizationId: true,
          amountMinor: true,
          currency: true,
          confirmedAt: true,
          createdAt: true,
        },
      });

      return payments.map(
        (payment: {
          id: string;
          organizationId: string;
          amountMinor: number;
          currency: string;
          confirmedAt: Date | null;
          createdAt: Date;
        }) => ({
          id: payment.id,
          organizationId: payment.organizationId,
          amountMinor: payment.amountMinor,
          currency: payment.currency,
          succeededAt: payment.confirmedAt ?? payment.createdAt,
        })
      );
    },
    async listSignificantActivities(range) {
      const [activityEvents, messages, campaigns, paymentTransactions] =
        await Promise.all([
          prisma.activityEvent.findMany({
            where: {
              createdAt: {
                gte: range.start,
                lte: range.end,
              },
            },
            select: {
              organizationId: true,
              createdAt: true,
            },
          }),
          prisma.message.findMany({
            where: {
              createdAt: {
                gte: range.start,
                lte: range.end,
              },
            },
            select: {
              organizationId: true,
              createdAt: true,
            },
          }),
          prisma.campaign.findMany({
            where: {
              createdAt: {
                gte: range.start,
                lte: range.end,
              },
            },
            select: {
              organizationId: true,
              createdAt: true,
            },
          }),
          prisma.paymentTransaction.findMany({
            where: {
              status: "succeeded",
              OR: [
                {
                  confirmedAt: {
                    gte: range.start,
                    lte: range.end,
                  },
                },
                {
                  confirmedAt: null,
                  createdAt: {
                    gte: range.start,
                    lte: range.end,
                  },
                },
              ],
            },
            select: {
              organizationId: true,
              confirmedAt: true,
              createdAt: true,
            },
          }),
        ]);

      return [
        ...activityEvents.map(
          (item: { organizationId: string; createdAt: Date }) => ({
            organizationId: item.organizationId,
            occurredAt: item.createdAt,
          })
        ),
        ...messages.map(
          (item: { organizationId: string; createdAt: Date }) => ({
            organizationId: item.organizationId,
            occurredAt: item.createdAt,
          })
        ),
        ...campaigns.map(
          (item: { organizationId: string; createdAt: Date }) => ({
            organizationId: item.organizationId,
            occurredAt: item.createdAt,
          })
        ),
        ...paymentTransactions.map(
          (item: {
            organizationId: string;
            confirmedAt: Date | null;
            createdAt: Date;
          }) => ({
            organizationId: item.organizationId,
            occurredAt: item.confirmedAt ?? item.createdAt,
          })
        ),
      ];
    },
  };
}

export function createMockVisitorsSource(
  points = founderAdminAnalyticsFixtures.visitors
): AnalyticsVisitorsSource {
  return {
    async getDailyUniqueVisitors(range) {
      const byDate = new Map(points.map((point) => [point.date, point.value]));
      const totalDays =
        Math.floor(
          (range.end.getTime() - range.start.getTime()) / (24 * 60 * 60 * 1000)
        ) + 1;

      return {
        points: Array.from({ length: totalDays }, (_, index) => {
          const date = formatDateKey(addDays(range.start, index));
          return {
            date,
            value: byDate.get(date) ?? 0,
          };
        }),
        source: "mock",
      };
    },
  };
}

export function createPostHogVisitorsSource(): AnalyticsVisitorsSource {
  const client = createPostHogAdminClient();

  return {
    async getDailyUniqueVisitors(range) {
      const response = await client.getDailyUniqueVisitors(range);
      return {
        points: response.results,
        source: response.source,
      };
    },
  };
}

function resolveBusinessSource(options: AnalyticsServiceOptions): {
  source: AnalyticsBusinessSource;
  sourceName: FounderAdminDataSource;
} {
  if (options.businessSource) {
    return {
      source: options.businessSource,
      sourceName: "business-db",
    };
  }

  if (hasDatabaseConfigured()) {
    return {
      source: createPrismaAnalyticsBusinessSource(),
      sourceName: "business-db",
    };
  }

  return {
    source: createMockAnalyticsBusinessSource(),
    sourceName: "mock",
  };
}

function resolveVisitorsSource(options: AnalyticsServiceOptions): {
  source: AnalyticsVisitorsSource;
  sourceName: FounderAdminDataSource;
} {
  if (options.visitorsSource) {
    return {
      source: options.visitorsSource,
      sourceName: "posthog",
    };
  }

  if (getPostHogAdminConfigFromEnv()) {
    return {
      source: createPostHogVisitorsSource(),
      sourceName: "posthog",
    };
  }

  return {
    source: createMockVisitorsSource(),
    sourceName: "mock",
  };
}

function getRangeWarnings(sourceName: FounderAdminDataSource): string[] {
  if (sourceName === "mock") {
    return [
      "Using founder/admin fixture data because no live provider is configured.",
    ];
  }

  return [];
}

function deriveCurrency(payments: SuccessfulPaymentRecord[]): string {
  return payments[0]?.currency ?? "XAF";
}

function mapFirstSuccessfulPayment(
  payments: SuccessfulPaymentRecord[]
): Map<string, SuccessfulPaymentRecord> {
  const sorted = [...payments].sort(
    (left, right) => left.succeededAt.getTime() - right.succeededAt.getTime()
  );
  const result = new Map<string, SuccessfulPaymentRecord>();

  for (const payment of sorted) {
    if (!result.has(payment.organizationId)) {
      result.set(payment.organizationId, payment);
    }
  }

  return result;
}

export async function getRevenueCollectedLast30Days(
  options: AnalyticsServiceOptions = {}
): Promise<RevenueSnapshot> {
  const asOf = options.asOf ?? new Date();
  const range = createTrailingRange(asOf, 30, "Last 30 days");
  const { source, sourceName } = resolveBusinessSource(options);
  const warnings = getRangeWarnings(sourceName);
  const payments = await source.listSuccessfulPaymentsThrough(range.end);
  const paymentsInRange = payments.filter((payment) =>
    isWithinRange(payment.succeededAt, range)
  );
  const collectedRevenueMinor = sum(
    paymentsInRange.map((payment) => payment.amountMinor)
  );

  return {
    currency: deriveCurrency(paymentsInRange),
    range,
    collectedRevenueMinor,
    estimatedAnnualRevenueMinor: collectedRevenueMinor * 12,
    successfulPaymentsCount: paymentsInRange.length,
    source: sourceName,
    warnings,
  };
}

export async function getEstimatedAnnualRevenue(
  options: AnalyticsServiceOptions = {}
): Promise<RevenueSnapshot> {
  return getRevenueCollectedLast30Days(options);
}

export async function getNewCustomersCount(
  range: FounderAdminDateRange,
  options: AnalyticsServiceOptions = {}
): Promise<number> {
  const { source } = resolveBusinessSource(options);
  const allPayments = await source.listSuccessfulPaymentsThrough(range.end);
  const firstPayments = mapFirstSuccessfulPayment(allPayments);

  return Array.from(firstPayments.values()).filter((payment) =>
    isWithinRange(payment.succeededAt, range)
  ).length;
}

export async function getNewCustomersWeeklyAndMonthly(
  options: AnalyticsServiceOptions = {}
): Promise<CustomerAcquisitionSnapshot> {
  const asOf = options.asOf ?? new Date();
  const weeklyRange = createTrailingRange(asOf, 7, "Last 7 days");
  const monthlyRange = createTrailingRange(asOf, 30, "Last 30 days");
  const { sourceName } = resolveBusinessSource(options);

  const [weeklyNewCustomers, monthlyNewCustomers] = await Promise.all([
    getNewCustomersCount(weeklyRange, options),
    getNewCustomersCount(monthlyRange, options),
  ]);

  return {
    weeklyRange,
    monthlyRange,
    weeklyNewCustomers,
    monthlyNewCustomers,
    source: sourceName,
    warnings: getRangeWarnings(sourceName),
  };
}

export async function getActiveAccounts30d(
  options: AnalyticsServiceOptions = {}
): Promise<number> {
  const asOf = options.asOf ?? new Date();
  const range = createTrailingRange(asOf, 30, "Last 30 days");
  const { source } = resolveBusinessSource(options);
  const activities = await source.listSignificantActivities(range);

  return new Set(activities.map((activity) => activity.organizationId)).size;
}

export async function getPayingUsersCount(
  options: AnalyticsServiceOptions = {}
): Promise<number> {
  const asOf = options.asOf ?? new Date();
  const currentPeriod = createCurrentMonthRange(asOf);
  const { source } = resolveBusinessSource(options);
  const [organizations, payments] = await Promise.all([
    source.listOrganizations(),
    source.listSuccessfulPaymentsThrough(currentPeriod.end),
  ]);

  const organizationsWithCurrentPayments = new Set(
    payments
      .filter((payment) => isWithinRange(payment.succeededAt, currentPeriod))
      .map((payment) => payment.organizationId)
  );

  return organizations.filter((organization) => {
    const normalizedPlan = BillingCatalogService.normalizePlanCode(
      organization.planCode
    );

    return (
      normalizedPlan !== "free" ||
      organizationsWithCurrentPayments.has(organization.id)
    );
  }).length;
}

export async function getUniqueVisitorsSeries(
  range: FounderAdminDateRange,
  options: AnalyticsServiceOptions = {}
): Promise<{
  points: VisitorPoint[];
  source: FounderAdminDataSource;
  warnings: string[];
}> {
  const { source, sourceName } = resolveVisitorsSource(options);

  try {
    const result = await source.getDailyUniqueVisitors(range);
    return {
      points: result.points,
      source: result.source,
      warnings: getRangeWarnings(result.source),
    };
  } catch (error) {
    if (options.useMockFallback === false) {
      throw error;
    }

    const fallback =
      await createMockVisitorsSource().getDailyUniqueVisitors(range);
    const warning =
      error instanceof PostHogAdminError
        ? `PostHog query failed, using fixture series instead: ${error.message}`
        : "Visitor analytics provider failed, using fixture series instead.";

    return {
      points: fallback.points,
      source: "mock",
      warnings: sourceName === "mock" ? getRangeWarnings("mock") : [warning],
    };
  }
}

export async function getUniqueVisitorsLast10Days(
  options: AnalyticsServiceOptions = {}
): Promise<VisitorPoint[]> {
  const asOf = options.asOf ?? new Date();
  const range = createTrailingRange(asOf, 10, "Last 10 days");
  const result = await getUniqueVisitorsSeries(range, options);

  return result.points;
}

export async function getOverviewMetrics(
  options: AnalyticsServiceOptions = {}
): Promise<OverviewMetrics> {
  const asOf = options.asOf ?? new Date();
  const businessSourceName = resolveBusinessSource(options).sourceName;
  const [
    revenue,
    customerAcquisition,
    activeAccounts30d,
    payingUsersCount,
    visitors,
  ] = await Promise.all([
    getRevenueCollectedLast30Days({ ...options, asOf }),
    getNewCustomersWeeklyAndMonthly({ ...options, asOf }),
    getActiveAccounts30d({ ...options, asOf }),
    getPayingUsersCount({ ...options, asOf }),
    getUniqueVisitorsSeries(createTrailingRange(asOf, 10, "Last 10 days"), {
      ...options,
      asOf,
    }),
  ]);

  return {
    generatedAt: asOf,
    currency: revenue.currency,
    revenue,
    customerAcquisition,
    activeAccounts30d,
    payingUsersCount,
    uniqueVisitorsLast10Days: visitors.points,
    sources: {
      revenue: revenue.source,
      customerAcquisition: customerAcquisition.source,
      activeAccounts30d: businessSourceName,
      payingUsersCount: businessSourceName,
      uniqueVisitorsLast10Days: visitors.source,
    },
    warnings: [
      ...revenue.warnings,
      ...customerAcquisition.warnings,
      ...visitors.warnings,
    ],
  };
}
