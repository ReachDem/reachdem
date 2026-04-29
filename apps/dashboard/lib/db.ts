import { unstable_cache } from "next/cache";
import { prisma } from "@reachdem/database";
import { startOfMonth, subMonths } from "date-fns";

export type CustomerRow = {
  id: string;
  name: string;
  companyName: string | null;
  country: string | null;
  planCode: string;
  senderId: string | null;
  websiteUrl: string | null;
  workspaceVerificationStatus: string;
  workspaceVerifiedAt: Date | null;
  idDocumentKey: string | null;
  businessDocumentKey: string | null;
  createdAt: Date;
  _count: { members: number; campaigns: number };
};

// ─── Customers (live – not cached, used in admin verification flow) ───────────

export async function getCustomers(): Promise<CustomerRow[]> {
  return prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      companyName: true,
      country: true,
      planCode: true,
      senderId: true,
      websiteUrl: true,
      workspaceVerificationStatus: true,
      workspaceVerifiedAt: true,
      idDocumentKey: true,
      businessDocumentKey: true,
      createdAt: true,
      _count: { select: { members: true, campaigns: true } },
    },
    orderBy: [
      // pending first so they're immediately visible
      { workspaceVerificationStatus: "asc" },
      { createdAt: "desc" },
    ],
  }) as Promise<CustomerRow[]>;
}

const CACHE_TTL = 3600; // 1h

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** amountMinor → XAF major unit (XAF has no decimal, stored as integer) */
const toMajor = (minor: number) => minor;

// ─── 1. KPI: MRR, Clients actifs, Clients payants, MRR perdu ─────────────────

export const getKpiStats = unstable_cache(
  async () => {
    const now = new Date();
    const startCurrent = startOfMonth(now);
    const startPrevious = startOfMonth(subMonths(now, 1));

    // MRR = revenus subscriptions succeeded ce mois-ci
    type AmtRow = { total: bigint | null };

    const [
      mrrCurrent,
      mrrPrevious,
      churnedCurrent,
      churnedPrevious,
      activeOrgsCurrent,
      activeOrgsPrevious,
      payingOrgsCurrent,
      payingOrgsPrevious,
    ] = await Promise.all([
      // MRR current
      prisma.$queryRaw<AmtRow[]>`
        SELECT COALESCE(SUM(pt."amountMinor"),0)::bigint AS total
        FROM "payment_transaction" pt
        JOIN "payment_session" ps ON ps.id = pt."paymentSessionId"
        WHERE pt.status = 'succeeded'
          AND ps.kind = 'subscription'
          AND pt."confirmedAt" >= ${startCurrent}
      `,
      // MRR previous
      prisma.$queryRaw<AmtRow[]>`
        SELECT COALESCE(SUM(pt."amountMinor"),0)::bigint AS total
        FROM "payment_transaction" pt
        JOIN "payment_session" ps ON ps.id = pt."paymentSessionId"
        WHERE pt.status = 'succeeded'
          AND ps.kind = 'subscription'
          AND pt."confirmedAt" >= ${startPrevious}
          AND pt."confirmedAt" < ${startCurrent}
      `,
      // Churned (refunded/cancelled subscriptions) current
      prisma.$queryRaw<AmtRow[]>`
        SELECT COALESCE(SUM(pt."amountMinor"),0)::bigint AS total
        FROM "payment_transaction" pt
        JOIN "payment_session" ps ON ps.id = pt."paymentSessionId"
        WHERE pt.status IN ('refunded','cancelled')
          AND ps.kind = 'subscription'
          AND pt."updatedAt" >= ${startCurrent}
      `,
      // Churned previous
      prisma.$queryRaw<AmtRow[]>`
        SELECT COALESCE(SUM(pt."amountMinor"),0)::bigint AS total
        FROM "payment_transaction" pt
        JOIN "payment_session" ps ON ps.id = pt."paymentSessionId"
        WHERE pt.status IN ('refunded','cancelled')
          AND ps.kind = 'subscription'
          AND pt."updatedAt" >= ${startPrevious}
          AND pt."updatedAt" < ${startCurrent}
      `,
      // Active orgs current (at least 1 message sent)
      prisma.message
        .groupBy({
          by: ["organizationId"],
          where: { createdAt: { gte: startCurrent } },
        })
        .then((r) => r.length),
      // Active orgs previous
      prisma.message
        .groupBy({
          by: ["organizationId"],
          where: { createdAt: { gte: startPrevious, lt: startCurrent } },
        })
        .then((r) => r.length),
      // Paying orgs current
      prisma.paymentTransaction
        .groupBy({
          by: ["organizationId"],
          where: { status: "succeeded", confirmedAt: { gte: startCurrent } },
        })
        .then((r) => r.length),
      // Paying orgs previous
      prisma.paymentTransaction
        .groupBy({
          by: ["organizationId"],
          where: {
            status: "succeeded",
            confirmedAt: { gte: startPrevious, lt: startCurrent },
          },
        })
        .then((r) => r.length),
    ]);

    return {
      mrr: {
        current: toMajor(Number((mrrCurrent[0] as AmtRow)?.total ?? 0)),
        previous: toMajor(Number((mrrPrevious[0] as AmtRow)?.total ?? 0)),
      },
      churned: {
        current: toMajor(Number((churnedCurrent[0] as AmtRow)?.total ?? 0)),
        previous: toMajor(Number((churnedPrevious[0] as AmtRow)?.total ?? 0)),
      },
      activeOrgs: { current: activeOrgsCurrent, previous: activeOrgsPrevious },
      payingOrgs: { current: payingOrgsCurrent, previous: payingOrgsPrevious },
    };
  },
  ["kpi-stats"],
  { revalidate: CACHE_TTL }
);

// ─── 2. Revenus totaux — Year-over-year (mensuel) ─────────────────────────────

type MonthRevenueRow = { month: string; total: bigint };

export const getMonthlyRevenue = unstable_cache(
  async () => {
    const rows = await prisma.$queryRaw<MonthRevenueRow[]>`
      SELECT
        to_char(pt."confirmedAt" AT TIME ZONE 'UTC', 'YYYY-MM') AS month,
        COALESCE(SUM(pt."amountMinor"),0)::bigint AS total
      FROM "payment_transaction" pt
      WHERE pt.status = 'succeeded'
        AND pt."confirmedAt" >= NOW() - INTERVAL '24 months'
      GROUP BY month
      ORDER BY month ASC
    `;

    const now = new Date();
    const currentYear = now.getFullYear();
    const previousYear = currentYear - 1;

    const byMonth: Record<
      string,
      { month: string; thisYear: number; lastYear: number }
    > = {};
    for (const row of rows) {
      const [year, mon] = row.month.split("-");
      if (!byMonth[mon!])
        byMonth[mon!] = { month: mon!, thisYear: 0, lastYear: 0 };
      if (Number(year) === currentYear)
        byMonth[mon!]!.thisYear = toMajor(Number(row.total));
      if (Number(year) === previousYear)
        byMonth[mon!]!.lastYear = toMajor(Number(row.total));
    }

    return Object.values(byMonth).sort((a, b) =>
      a.month.localeCompare(b.month)
    );
  },
  ["monthly-revenue"],
  { revalidate: CACHE_TTL }
);

// ─── 3. MRR par plan — 6 derniers mois ───────────────────────────────────────

type PlanRow = { month: string; plan: string; total: bigint };

export const getMrrByPlan = unstable_cache(
  async () => {
    const rows = await prisma.$queryRaw<PlanRow[]>`
      SELECT
        to_char(pt."confirmedAt" AT TIME ZONE 'UTC', 'YYYY-MM') AS month,
        COALESCE(ps."planCode", o."planCode", 'free') AS plan,
        COALESCE(SUM(pt."amountMinor"),0)::bigint AS total
      FROM "payment_transaction" pt
      JOIN "payment_session" ps ON ps.id = pt."paymentSessionId"
      JOIN "organization" o ON o.id = pt."organizationId"
      WHERE pt.status = 'succeeded'
        AND ps.kind = 'subscription'
        AND pt."confirmedAt" >= NOW() - INTERVAL '6 months'
      GROUP BY month, plan
      ORDER BY month ASC
    `;

    const plans = ["free", "starter", "pro", "enterprise"];
    const map: Record<string, Record<string, number>> = {};

    for (const row of rows) {
      if (!map[row.month]) map[row.month] = {};
      map[row.month]![row.plan] = toMajor(Number(row.total));
    }

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, vals]) => ({
        month,
        free: vals["free"] ?? 0,
        starter: vals["starter"] ?? 0,
        pro: vals["pro"] ?? 0,
        enterprise: vals["enterprise"] ?? 0,
      }));
  },
  ["mrr-by-plan"],
  { revalidate: CACHE_TTL }
);

// ─── 4. ARPU — last 28 days with daily bar + avg reference line ───────────────

type ArpuDayRow = { day: string; revenue: bigint; orgs: bigint };

export const getArpu = unstable_cache(
  async () => {
    const rows = await prisma.$queryRaw<ArpuDayRow[]>`
      SELECT
        to_char(pt."confirmedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
        COALESCE(SUM(pt."amountMinor"),0)::bigint AS revenue,
        COUNT(DISTINCT pt."organizationId")::bigint AS orgs
      FROM "payment_transaction" pt
      WHERE pt.status = 'succeeded'
        AND pt."confirmedAt" >= NOW() - INTERVAL '28 days'
      GROUP BY day
      ORDER BY day ASC
    `;

    const data = rows.map((r) => {
      const orgs = Number(r.orgs);
      const rev = toMajor(Number(r.revenue));
      return {
        day: r.day,
        arpu: orgs > 0 ? Math.round(rev / orgs) : 0,
      };
    });

    const avg =
      data.length > 0
        ? Math.round(data.reduce((s, r) => s + r.arpu, 0) / data.length)
        : 0;

    // totals for the KPI badge
    type TotalRow = { revenue: bigint; orgs: bigint };
    const [totCurrent, totPrevious] = await Promise.all([
      prisma.$queryRaw<TotalRow[]>`
        SELECT
          COALESCE(SUM(pt."amountMinor"),0)::bigint AS revenue,
          COUNT(DISTINCT pt."organizationId")::bigint AS orgs
        FROM "payment_transaction" pt
        WHERE pt.status = 'succeeded'
          AND pt."confirmedAt" >= NOW() - INTERVAL '28 days'
      `,
      prisma.$queryRaw<TotalRow[]>`
        SELECT
          COALESCE(SUM(pt."amountMinor"),0)::bigint AS revenue,
          COUNT(DISTINCT pt."organizationId")::bigint AS orgs
        FROM "payment_transaction" pt
        WHERE pt.status = 'succeeded'
          AND pt."confirmedAt" >= NOW() - INTERVAL '56 days'
          AND pt."confirmedAt" < NOW() - INTERVAL '28 days'
      `,
    ]);

    const curOrgs = Number((totCurrent[0] as TotalRow)?.orgs ?? 0);
    const curRev = toMajor(Number((totCurrent[0] as TotalRow)?.revenue ?? 0));
    const prevOrgs = Number((totPrevious[0] as TotalRow)?.orgs ?? 0);
    const prevRev = toMajor(Number((totPrevious[0] as TotalRow)?.revenue ?? 0));

    const arpuCurrent = curOrgs > 0 ? Math.round(curRev / curOrgs) : 0;
    const arpuPrevious = prevOrgs > 0 ? Math.round(prevRev / prevOrgs) : 0;

    return { data, avg, arpuCurrent, arpuPrevious };
  },
  ["arpu"],
  { revalidate: CACHE_TTL }
);

// ─── 5. Orgs actives par jour — 28j vs 28j précédents ────────────────────────

type DailyActiveRow = { day: string; orgs: bigint };

export const getDailyActiveOrgs = unstable_cache(
  async () => {
    const [current, previous] = await Promise.all([
      prisma.$queryRaw<DailyActiveRow[]>`
        SELECT
          to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
          COUNT(DISTINCT "organizationId")::bigint AS orgs
        FROM "message"
        WHERE "createdAt" >= NOW() - INTERVAL '28 days'
        GROUP BY day
        ORDER BY day ASC
      `,
      prisma.$queryRaw<DailyActiveRow[]>`
        SELECT
          to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
          COUNT(DISTINCT "organizationId")::bigint AS orgs
        FROM "message"
        WHERE "createdAt" >= NOW() - INTERVAL '56 days'
          AND "createdAt" < NOW() - INTERVAL '28 days'
        GROUP BY day
        ORDER BY day ASC
      `,
    ]);

    const curData = current.map((r) => ({ day: r.day, value: Number(r.orgs) }));
    const prevData = previous.map((r) => ({
      day: r.day,
      value: Number(r.orgs),
    }));

    const totalCurrent =
      curData.length > 0
        ? Math.round(curData.reduce((s, r) => s + r.value, 0) / curData.length)
        : 0;
    const totalPrevious =
      prevData.length > 0
        ? Math.round(
            prevData.reduce((s, r) => s + r.value, 0) / prevData.length
          )
        : 0;

    return {
      current: curData,
      previous: prevData,
      totalCurrent,
      totalPrevious,
    };
  },
  ["daily-active-orgs"],
  { revalidate: CACHE_TTL }
);

// ─── 6. Clients par plan (donut) ─────────────────────────────────────────────

type PlanDistRow = { plan: string; total: bigint };

export const getClientsByPlan = unstable_cache(
  async () => {
    const rows = await prisma.$queryRaw<PlanDistRow[]>`
      SELECT
        COALESCE("planCode", 'free') AS plan,
        COUNT(*)::bigint AS total
      FROM "organization"
      GROUP BY plan
      ORDER BY total DESC
    `;

    const items = rows.map((r) => ({
      name: r.plan.charAt(0).toUpperCase() + r.plan.slice(1),
      value: Number(r.total),
    }));

    const totalOrgs = items.reduce((s, i) => s + i.value, 0);
    return { items, totalOrgs };
  },
  ["clients-by-plan"],
  { revalidate: CACHE_TTL }
);
