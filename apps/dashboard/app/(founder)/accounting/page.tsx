import {
  buildAccountingSnapshot,
  generateAccountingPdfReport,
} from "@/lib/founder-admin/reporting";
import { KpiCard } from "@/components/founder-admin/kpi-card";
import { PdfReportGenerator } from "@/components/founder-admin/pdf-report-generator";
import { FounderPageShell } from "@/components/founder-admin/page-shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { TrendingUp, DollarSign, BarChart2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

function trailingDays(days: number) {
  const end = new Date();
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return { start, end, label: `Last ${days} days` };
}

function rangeFromKey(key: string) {
  switch (key) {
    case "last60":
      return trailingDays(60);
    case "last90":
      return trailingDays(90);
    case "mtd": {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: now,
        label: "Month to date",
      };
    }
    default:
      return trailingDays(30);
  }
}

async function generatePdf(
  rangeKey: string
): Promise<{ fileName: string; base64: string }> {
  "use server";
  const range = rangeFromKey(rangeKey);
  const snapshot = await buildAccountingSnapshot(range);
  const result = await generateAccountingPdfReport({ snapshot });
  const base64 = Buffer.from(result.bytes).toString("base64");
  return { fileName: result.fileName, base64 };
}

function formatCurrency(amountMinor: number, currency = "XAF"): string {
  const amount = amountMinor / 100;
  return `${amount.toLocaleString("fr-FR")} ${currency}`;
}

function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

export default async function AccountingPage() {
  const range = trailingDays(30);
  const snapshot = await buildAccountingSnapshot(range);
  const isMock = snapshot.sources.revenue === "mock";

  return (
    <FounderPageShell
      title="Accounting"
      description="Follow revenue quality, direct message costs, and the margin envelope that supports founder decisions."
      facts={[
        {
          label: "Reporting Window",
          value: range.label,
          detail: isMock
            ? "Financial data is currently mocked"
            : "Live accounting snapshot",
        },
        {
          label: "Collected Revenue",
          value: formatCurrency(
            snapshot.collectedRevenueMinor,
            snapshot.currency
          ),
          detail: `${snapshot.successfulPaymentsCount.toLocaleString()} successful payments`,
        },
        {
          label: "Gross Margin",
          value: formatPercent(snapshot.grossMarginEstimateRatio),
          detail: formatCurrency(
            snapshot.grossMarginEstimateMinor,
            snapshot.currency
          ),
          tone:
            snapshot.grossMarginEstimateRatio >= 0.5 ? "success" : "warning",
        },
      ]}
    >
      {snapshot.warnings.length > 0 ? (
        <Alert className="rounded-[24px] border-amber-400/30 bg-amber-400/10 text-amber-200 [&>svg]:text-amber-300">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {snapshot.warnings[0]}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <KpiCard
          title="Collected Revenue"
          value={formatCurrency(
            snapshot.collectedRevenueMinor,
            snapshot.currency
          )}
          subtext={`${snapshot.successfulPaymentsCount} successful payments in 30 days`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard
          title="Direct Messaging Costs"
          value={formatCurrency(
            snapshot.directMessagingCostsMinor,
            snapshot.currency
          )}
          subtext="Estimated cost per sent message by channel."
          icon={<BarChart2 className="h-4 w-4" />}
        />
        <KpiCard
          title="Gross Margin Estimate"
          value={formatCurrency(
            snapshot.grossMarginEstimateMinor,
            snapshot.currency
          )}
          subtext={`${formatPercent(snapshot.grossMarginEstimateRatio)} margin rate`}
          icon={<TrendingUp className="h-4 w-4" />}
          trend={{
            value: Math.round(snapshot.grossMarginEstimateRatio * 100),
            label: "Margin rate",
          }}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="rounded-[26px] border border-white/6">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Messages Sent by Channel
            </CardTitle>
            <CardDescription className="text-sm">
              Volume used to estimate direct messaging costs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Object.entries(snapshot.sentMessagesByChannel).map(
                ([channel, count]) => (
                  <div
                    key={channel}
                    data-founder-surface="tile"
                    className="rounded-2xl px-3 py-3"
                  >
                    <p className="text-[0.68rem] tracking-[0.2em] text-[color:var(--founder-quiet-foreground)] uppercase">
                      {channel}
                    </p>
                    <p className="mt-2 text-xl font-semibold tabular-nums">
                      {count.toLocaleString()}
                    </p>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        <PdfReportGenerator snapshot={snapshot} onGenerate={generatePdf} />
      </div>
    </FounderPageShell>
  );
}
