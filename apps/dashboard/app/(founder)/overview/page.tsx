import { TrendingUp, Users, Activity, CreditCard } from "lucide-react";
import { KpiCard } from "@/components/founder-admin/kpi-card";
import { VisitorsBarChart } from "@/components/founder-admin/visitors-bar-chart";
import { SystemLogsTable } from "@/components/founder-admin/system-logs-table";
import { FounderPageShell } from "@/components/founder-admin/page-shell";
import { getOverviewMetrics } from "@/lib/founder-admin/analytics";
import { listSystemLogs } from "@/lib/founder-admin/monitoring";
import type { FounderAdminLogLevel } from "@/lib/founder-admin/types";

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
  const dataIsMock = metrics.sources.revenue === "mock";
  const snapshotLabel = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(metrics.generatedAt));

  return (
    <FounderPageShell
      title="Overview"
      description="Get the founder readout for growth, revenue posture, and platform health without hopping between surfaces."
      facts={[
        {
          label: "Snapshot",
          value: snapshotLabel,
          detail: dataIsMock
            ? "Using sample financial inputs"
            : "Live founder analytics",
        },
        {
          label: "Collected Revenue",
          value: formatCurrency(collected30d, metrics.currency),
          detail: "Trailing 30 days",
        },
        {
          label: "Active Accounts",
          value: metrics.activeAccounts30d.toLocaleString(),
          detail: "Accounts with meaningful activity",
        },
        {
          label: "Acquisition",
          value: `${customerAcquisition.monthlyNewCustomers.toLocaleString()} new`,
          detail: `${customerAcquisition.weeklyNewCustomers.toLocaleString()} added this week`,
          tone: "success",
        },
      ]}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <KpiCard
          title="Estimated Annual Revenue"
          value={formatCurrency(estimatedAnnual, metrics.currency)}
          subtext="Annualized from the latest 30-day collection window."
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KpiCard
          title="New Customers"
          value={
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {customerAcquisition.monthlyNewCustomers}
              </span>
              <span className="text-sm font-normal text-[color:var(--founder-muted-foreground)]">
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
          subtext="Meaningful product activity in the last 30 days."
          icon={<Activity className="h-4 w-4" />}
        />
        <KpiCard
          title="Paying Users"
          value={metrics.payingUsersCount.toLocaleString()}
          subtext={`Collected ${formatCurrency(collected30d, metrics.currency)} in 30 days`}
          icon={<CreditCard className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <VisitorsBarChart
          data={metrics.uniqueVisitorsLast10Days}
          source={metrics.sources.uniqueVisitorsLast10Days}
        />
        <SystemLogsTable initialData={initialLogs} onFetch={fetchLogs} />
      </div>
    </FounderPageShell>
  );
}
