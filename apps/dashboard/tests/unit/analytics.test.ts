import {
  founderAdminAnalyticsFixtures,
  founderAdminFixtureNow,
} from "@/fixtures/founder-admin";
import {
  createMockAnalyticsBusinessSource,
  createMockVisitorsSource,
  getActiveAccounts30d,
  getOverviewMetrics,
  getRevenueCollectedLast30Days,
  getNewCustomersWeeklyAndMonthly,
  getPayingUsersCount,
  getUniqueVisitorsSeries,
} from "@/lib/founder-admin/analytics";
import { createTrailingRange } from "@/lib/founder-admin/shared/date";

describe("founder admin analytics", () => {
  it("calculates annualized revenue from the last 30 days", async () => {
    const revenue = await getRevenueCollectedLast30Days({
      asOf: founderAdminFixtureNow,
      businessSource: createMockAnalyticsBusinessSource(),
    });

    expect(revenue.collectedRevenueMinor).toBe(310000);
    expect(revenue.estimatedAnnualRevenueMinor).toBe(3720000);
    expect(revenue.successfulPaymentsCount).toBe(5);
  });

  it("counts new customers from first successful payments only", async () => {
    const acquisition = await getNewCustomersWeeklyAndMonthly({
      asOf: founderAdminFixtureNow,
      businessSource: createMockAnalyticsBusinessSource(),
    });

    expect(acquisition.weeklyNewCustomers).toBe(2);
    expect(acquisition.monthlyNewCustomers).toBe(4);
  });

  it("counts active accounts over 30 days from significant business activity", async () => {
    const activeAccounts = await getActiveAccounts30d({
      asOf: founderAdminFixtureNow,
      businessSource: createMockAnalyticsBusinessSource(),
    });

    expect(activeAccounts).toBe(5);
  });

  it("counts paying users from paid plans or current-period successful payments", async () => {
    const payingUsersCount = await getPayingUsersCount({
      asOf: founderAdminFixtureNow,
      businessSource: createMockAnalyticsBusinessSource(),
    });

    expect(payingUsersCount).toBe(4);
  });

  it("falls back to fixture visitors when the provider fails", async () => {
    const visitors = await getUniqueVisitorsSeries(
      createTrailingRange(founderAdminFixtureNow, 10, "Last 10 days"),
      {
        asOf: founderAdminFixtureNow,
        visitorsSource: {
          async getDailyUniqueVisitors() {
            throw new Error("boom");
          },
        },
      }
    );

    expect(visitors.source).toBe("mock");
    expect(visitors.warnings[0]).toContain("using fixture series");
    expect(visitors.points).toEqual(founderAdminAnalyticsFixtures.visitors);
  });

  it("aggregates overview metrics with stable source metadata", async () => {
    const overview = await getOverviewMetrics({
      asOf: founderAdminFixtureNow,
      businessSource: createMockAnalyticsBusinessSource(),
      visitorsSource: createMockVisitorsSource(),
    });

    expect(overview.revenue.collectedRevenueMinor).toBe(310000);
    expect(overview.customerAcquisition.weeklyNewCustomers).toBe(2);
    expect(overview.activeAccounts30d).toBe(5);
    expect(overview.uniqueVisitorsLast10Days).toHaveLength(10);
    expect(overview.sources.uniqueVisitorsLast10Days).toBe("mock");
  });
});
