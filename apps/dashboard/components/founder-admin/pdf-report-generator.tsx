"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FileText, Download } from "lucide-react";
import type { AccountingSnapshot } from "@/lib/founder-admin/types";

interface PdfReportGeneratorProps {
  snapshot: AccountingSnapshot;
  onGenerate: (
    rangeKey: string
  ) => Promise<{ fileName: string; base64: string }>;
}

const RANGE_OPTIONS = [
  { value: "last30", label: "Last 30 days" },
  { value: "last60", label: "Last 60 days" },
  { value: "last90", label: "Last 90 days" },
  { value: "mtd", label: "Month to date" },
];

export function PdfReportGenerator({
  snapshot,
  onGenerate,
}: PdfReportGeneratorProps) {
  const [rangeKey, setRangeKey] = useState("last30");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    setError(null);

    startTransition(async () => {
      try {
        const result = await onGenerate(rangeKey);
        const link = document.createElement("a");
        link.href = `data:application/pdf;base64,${result.base64}`;
        link.download = result.fileName;
        link.click();
      } catch (issue) {
        setError(
          issue instanceof Error ? issue.message : "PDF generation failed"
        );
      }
    });
  };

  return (
    <Card className="rounded-[26px] border border-white/6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4" aria-hidden="true" />
          Export PDF Report
        </CardTitle>
        <CardDescription className="text-sm">
          Generate a financial summary PDF for the selected period
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={rangeKey}
            onValueChange={(value) => setRangeKey(value ?? "last30")}
          >
            <SelectTrigger
              aria-label="Select export range"
              className="h-9 w-44 text-sm"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-sm"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={isPending}
            className="h-9 gap-2 text-sm"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            {isPending ? "Generating…" : "Generate PDF"}
          </Button>
        </div>

        <div aria-live="polite" className="space-y-3">
          {error ? <p className="text-destructive text-sm">{error}</p> : null}

          <div
            data-founder-surface="tile"
            className="rounded-2xl border border-dashed px-4 py-4"
          >
            <p className="text-[0.72rem] tracking-[0.2em] text-[color:var(--founder-quiet-foreground)] uppercase">
              Included Sections
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--founder-muted-foreground)]">
              Revenue summary, new customers, active accounts, messaging costs,
              gross margin estimate, and key metrics for{" "}
              {RANGE_OPTIONS.find((option) => option.value === rangeKey)?.label}
              .
            </p>
            <p className="mt-2 text-xs text-[color:var(--founder-quiet-foreground)]">
              Current baseline:{" "}
              {snapshot.successfulPaymentsCount.toLocaleString()} successful
              payment
              {snapshot.successfulPaymentsCount === 1 ? "" : "s"} in the active
              view.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
