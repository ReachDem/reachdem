import { Card, CardContent } from "@/components/ui/card";
import {
  IconArrowUpRight,
  IconArrowDownRight,
  IconCurrencyDollar,
  IconBuilding,
  IconUserCheck,
  IconTrendingDown,
} from "@tabler/icons-react";
import { trend } from "@/lib/utils";

type KpiData = {
  mrr: { current: number; previous: number };
  churned: { current: number; previous: number };
  activeOrgs: { current: number; previous: number };
  payingOrgs: { current: number; previous: number };
};

function formatXAF(amount: number) {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M FCFA`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K FCFA`;
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

function formatNum(n: number) {
  return n.toLocaleString("fr-FR");
}

function KpiCard({
  title,
  current,
  previous,
  icon: Icon,
  formatValue,
  invertTrend = false,
}: {
  title: string;
  current: number;
  previous: number;
  icon: React.ElementType;
  formatValue: (n: number) => string;
  invertTrend?: boolean;
}) {
  const { pct, up } = trend(current, previous);
  const positive = invertTrend ? !up : up;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <Icon size={18} className="text-muted-foreground/60" />
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight">
          {formatValue(current)}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5">
          {up ? (
            <IconArrowUpRight
              size={14}
              className={positive ? "text-emerald-500" : "text-rose-500"}
            />
          ) : (
            <IconArrowDownRight
              size={14}
              className={positive ? "text-emerald-500" : "text-rose-500"}
            />
          )}
          <span
            className={`text-xs font-medium ${positive ? "text-emerald-600" : "text-rose-600"}`}
          >
            {pct}%
          </span>
          <span className="text-muted-foreground text-xs">vs mois dernier</span>
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          Mois précédent&nbsp;: {formatValue(previous)}
        </p>
      </CardContent>
    </Card>
  );
}

export function KpiCards({ kpi }: { kpi: KpiData }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard
        title="MRR"
        current={kpi.mrr.current}
        previous={kpi.mrr.previous}
        icon={IconCurrencyDollar}
        formatValue={formatXAF}
      />
      <KpiCard
        title="Organisations actives"
        current={kpi.activeOrgs.current}
        previous={kpi.activeOrgs.previous}
        icon={IconBuilding}
        formatValue={formatNum}
      />
      <KpiCard
        title="Clients payants"
        current={kpi.payingOrgs.current}
        previous={kpi.payingOrgs.previous}
        icon={IconUserCheck}
        formatValue={formatNum}
      />
      <KpiCard
        title="MRR perdu"
        current={kpi.churned.current}
        previous={kpi.churned.previous}
        icon={IconTrendingDown}
        formatValue={formatXAF}
        invertTrend
      />
    </div>
  );
}
