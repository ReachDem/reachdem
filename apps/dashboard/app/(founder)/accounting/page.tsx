import {
  buildAccountingSnapshot,
  generateAccountingPdfReport,
} from "@/lib/founder-admin/reporting";
import { KpiCard } from "@/components/founder-admin/kpi-card";
import { PdfReportGenerator } from "@/components/founder-admin/pdf-report-generator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { TrendingUp, DollarSign, BarChart2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Build a date range helper
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

// Server action for PDF generation
async function generatePdf(
  rangeKey: string
): Promise<{ fileName: string; base64: string }> {
  "use server";
  const range = rangeFromKey(rangeKey);
  const snapshot = await buildAccountingSnapshot(range);
  const result = await generateAccountingPdfReport({ snapshot });
  // Convert Uint8Array to base64
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Accounting</h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Financial overview for the last 30 days.
          {isMock && (
            <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-sm font-medium text-amber-400">
              Sample data
            </span>
          )}
        </p>
      </div>

      {snapshot.warnings.length > 0 && (
        <Alert className="border-amber-400/30 bg-amber-400/10 text-amber-400 [&>svg]:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {snapshot.warnings[0]}
          </AlertDescription>
        </Alert>
      )}

      {/* 3 core widgets */}
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs sm:grid-cols-3">
        <KpiCard
          title="Collected Revenue (30d)"
          value={formatCurrency(
            snapshot.collectedRevenueMinor,
            snapshot.currency
          )}
          subtext={`${snapshot.successfulPaymentsCount} successful payments`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard
          title="Direct Messaging Costs (30d)"
          value={formatCurrency(
            snapshot.directMessagingCostsMinor,
            snapshot.currency
          )}
          subtext="Estimated cost per sent message by channel"
          icon={<BarChart2 className="h-4 w-4" />}
        />
        <KpiCard
          title="Gross Margin Estimate (30d)"
          value={formatCurrency(
            snapshot.grossMarginEstimateMinor,
            snapshot.currency
          )}
          subtext={`${formatPercent(snapshot.grossMarginEstimateRatio)} margin rate`}
          icon={<TrendingUp className="h-4 w-4" />}
          trend={{
            value: Math.round(snapshot.grossMarginEstimateRatio * 100),
            label: "margin",
          }}
        />
      </div>

      {/* Messages breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Messages Sent by Channel (30d)
          </CardTitle>
          <CardDescription className="text-sm">
            Volume used to estimate direct messaging costs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            {Object.entries(snapshot.sentMessagesByChannel).map(
              ([ch, count]) => (
                <div key={ch} className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-sm font-medium uppercase">
                    {ch}
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {count.toLocaleString()}
                  </p>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* PDF Generator */}
      <PdfReportGenerator snapshot={snapshot} onGenerate={generatePdf} />
    </div>
  );
}
