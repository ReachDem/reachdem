import { Suspense } from "react";
import { TrendingUp, Users, Activity, CreditCard } from "lucide-react";
import { KpiCard } from "@/components/founder-admin/kpi-card";
import { VisitorsBarChart } from "@/components/founder-admin/visitors-bar-chart";
import { SystemLogsTable } from "@/components/founder-admin/system-logs-table";
import { getOverviewMetrics } from "@/lib/founder-admin/analytics";
import { listSystemLogs } from "@/lib/founder-admin/monitoring";
import type { FounderAdminLogLevel } from "@/lib/founder-admin/types";

// Server action for log pagination
async function fetchLogs(params: {
  page: number;
  level?: FounderAdminLogLevel;
  query?: string;
}) {
  "use server";
  return listSystemLogs(params);
}

function formatCurrency(amountMinor: number, currency = "XAF"): string {
  const amount = amountMinor / 100;
  if (currency === "XAF") {
    return `${amount.toLocaleString("fr-FR")} XAF`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function OverviewPage() {
  const [metrics, initialLogs] = await Promise.all([
    getOverviewMetrics(),
    listSystemLogs({ page: 1, pageSize: 20 }),
  ]);

  const { revenue, customerAcquisition } = metrics;
  const estimatedAnnual = revenue.estimatedAnnualRevenueMinor;
  const collected30d = revenue.collectedRevenueMinor;

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Key metrics as of{" "}
          {new Date(metrics.generatedAt).toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
          {metrics.sources.revenue === "mock" && (
            <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-sm font-medium text-amber-400">
              Sample data
            </span>
          )}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Est. Annual Revenue"
          value={formatCurrency(estimatedAnnual, metrics.currency)}
          subtext="Annualized from last 30 days"
          icon={<TrendingUp className="h-4 w-4" />}
        />

        <KpiCard
          title="New Customers"
          value={
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {customerAcquisition.monthlyNewCustomers}
              </span>
              <span className="text-muted-foreground text-sm font-normal">
                monthly
              </span>
            </div>
          }
          subtext={`${customerAcquisition.weeklyNewCustomers} new this week`}
          icon={<Users className="h-4 w-4" />}
        />

        <KpiCard
          title="Active Accounts"
          value={metrics.activeAccounts30d.toLocaleString()}
          subtext="Meaningful activity in 30 days"
          icon={<Activity className="h-4 w-4" />}
        />

        <KpiCard
          title="Paying Users"
          value={metrics.payingUsersCount.toLocaleString()}
          subtext={`Collected ${formatCurrency(collected30d, metrics.currency)} in 30d`}
          icon={<CreditCard className="h-4 w-4" />}
        />
      </div>

      {/* Visitors bar chart */}
      <VisitorsBarChart
        data={metrics.uniqueVisitorsLast10Days}
        source={metrics.sources.uniqueVisitorsLast10Days}
      />

      {/* System logs */}
      <SystemLogsTable initialData={initialLogs} onFetch={fetchLogs} />
    </div>
  );
}
