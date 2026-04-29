import {
  getKpiStats,
  getMonthlyRevenue,
  getMrrByPlan,
  getArpu,
  getDailyActiveOrgs,
  getClientsByPlan,
  getCustomers,
} from "@/lib/db";
import { KpiCards } from "./_components/kpi-cards";
import { RevenueChart } from "./_components/revenue-chart";
import { MrrByPlanChart } from "./_components/channel-chart";
import { ArpuChart } from "./_components/delivery-rate-chart";
import { DailyActiveOrgsChart } from "./_components/daily-contacts-chart";
import { ClientsByPlanDonut } from "./_components/org-donut";
import { ExportButton } from "./_components/export-button";
import { CustomerTable } from "./_components/customer-table";

export const revalidate = 3600; // 1h ISR

export default async function OverviewPage() {
  const [kpi, monthly, mrrByPlan, arpu, dailyOrgs, byPlan, customers] =
    await Promise.all([
      getKpiStats(),
      getMonthlyRevenue(),
      getMrrByPlan(),
      getArpu(),
      getDailyActiveOrgs(),
      getClientsByPlan(),
      getCustomers(),
    ]);

  const totalThisYear = monthly.reduce((s, r) => s + r.thisYear, 0);
  const pendingCount = customers.filter(
    (c) => c.workspaceVerificationStatus === "pending"
  ).length;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="border-border flex shrink-0 items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">Vue d&apos;ensemble</h1>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Métriques financières · cache 1h
          </p>
        </div>
        <ExportButton kpi={kpi} monthly={monthly} byPlan={byPlan} />
      </header>

      {/* ── Body ───────────────────────────────────────────────── */}
      <main className="flex-1 space-y-6 px-6 py-6">
        {/* KPI cards */}
        <KpiCards kpi={kpi} />

        {/* Charts row 1 – full width */}
        <RevenueChart data={monthly} totalThisYear={totalThisYear} />

        {/* Charts row 2 – 2 cols */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <MrrByPlanChart data={mrrByPlan} />
          <ClientsByPlanDonut data={byPlan} />
        </div>

        {/* Charts row 3 – 2 cols */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ArpuChart data={arpu} />
          <DailyActiveOrgsChart data={dailyOrgs} />
        </div>

        {/* ── Customer list ───────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Clients</h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Validation Sender ID &amp; vérification KYB
                {pendingCount > 0 && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                    {pendingCount} en attente
                  </span>
                )}
              </p>
            </div>
          </div>
          <CustomerTable orgs={customers} />
        </section>
      </main>
    </div>
  );
}
