"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import type { WorkspaceInitialBalanceEntry } from "@reachdem/shared";
import {
  convertMajorToMinor,
  convertMinorToMajor,
  getCurrencyMinorExponent,
} from "@reachdem/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface WorkspaceSeedBalanceEditorProps {
  entries: WorkspaceInitialBalanceEntry[];
  baseCurrency: string;
  source: "default" | "database";
  lastUpdatedLabel?: string | null;
  lastUpdatedBy?: string | null;
  onSave: (entries: WorkspaceInitialBalanceEntry[]) => Promise<void>;
}

interface EditableEntry {
  currency: string;
  amountMajor: string;
}

function formatEntryAmount(entry: WorkspaceInitialBalanceEntry): string {
  const exponent = getCurrencyMinorExponent(entry.currency);
  const amountMajor = convertMinorToMajor(entry.amountMinor, entry.currency);

  return exponent === 0
    ? amountMajor.toFixed(0)
    : amountMajor.toFixed(exponent);
}

function toEditableEntries(
  entries: WorkspaceInitialBalanceEntry[]
): EditableEntry[] {
  return entries.map((entry) => ({
    currency: entry.currency,
    amountMajor: formatEntryAmount(entry),
  }));
}

export function WorkspaceSeedBalanceEditor({
  entries,
  baseCurrency,
  source,
  lastUpdatedLabel,
  lastUpdatedBy,
  onSave,
}: WorkspaceSeedBalanceEditorProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<EditableEntry[]>(() =>
    toEditableEntries(entries)
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(toEditableEntries(entries));
  }, [entries]);

  const hasChanges = useMemo(() => {
    return draft.some((entry, index) => {
      return entry.amountMajor !== formatEntryAmount(entries[index]);
    });
  }, [draft, entries]);

  const handleChange = (currency: string, amountMajor: string) => {
    setDraft((current) =>
      current.map((entry) =>
        entry.currency === currency ? { ...entry, amountMajor } : entry
      )
    );
  };

  const handleSave = () => {
    const normalizedEntries: WorkspaceInitialBalanceEntry[] = [];

    for (const entry of draft) {
      const trimmed = entry.amountMajor.trim();
      const parsedMajor = trimmed === "" ? Number.NaN : Number(trimmed);

      if (!Number.isFinite(parsedMajor) || parsedMajor < 0) {
        toast.error(`Enter a valid non-negative amount for ${entry.currency}.`);
        return;
      }

      normalizedEntries.push({
        currency: entry.currency,
        amountMinor: convertMajorToMinor(parsedMajor, entry.currency),
      });
    }

    startTransition(async () => {
      try {
        await onSave(normalizedEntries);
        toast.success("Initial balances updated for new workspaces.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to update initial balances."
        );
      }
    });
  };

  return (
    <Card className="rounded-[26px] border border-white/6">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="text-sm font-medium">
              New Workspace Seed Balance
            </CardTitle>
            <CardDescription className="max-w-3xl text-sm">
              Define the starting balance granted to every newly created
              workspace. This only affects future workspaces and leaves existing
              balances untouched.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-sm">
              Base currency: {baseCurrency}
            </Badge>
            <Badge variant="outline" className="text-sm capitalize">
              Source: {source}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--founder-muted-foreground)]">
          <span>{entries.length.toLocaleString()} currencies configured</span>
          {lastUpdatedLabel ? <span>- Updated {lastUpdatedLabel}</span> : null}
          {lastUpdatedBy ? <span>- by {lastUpdatedBy}</span> : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-0 sm:p-4">
        <div className="w-full overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-sm">Currency</TableHead>
                <TableHead className="text-sm">Initial Balance</TableHead>
                <TableHead className="text-sm">Minor Units</TableHead>
                <TableHead className="text-sm">Precision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {draft.map((entry) => {
                const exponent = getCurrencyMinorExponent(entry.currency);
                const previewMinor = Number.isFinite(Number(entry.amountMajor))
                  ? convertMajorToMinor(
                      Number(entry.amountMajor),
                      entry.currency
                    )
                  : "-";

                return (
                  <TableRow key={entry.currency} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm font-medium">
                      {entry.currency}
                    </TableCell>
                    <TableCell className="w-[220px]">
                      <Input
                        type="number"
                        min="0"
                        step={exponent === 0 ? "1" : "0.01"}
                        value={entry.amountMajor}
                        onChange={(event) =>
                          handleChange(entry.currency, event.target.value)
                        }
                        className="h-9 text-sm"
                        aria-label={`Initial balance for ${entry.currency}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {typeof previewMinor === "number"
                        ? previewMinor.toLocaleString()
                        : previewMinor}
                    </TableCell>
                    <TableCell className="text-sm text-[color:var(--founder-muted-foreground)]">
                      {exponent === 0
                        ? "No decimals"
                        : `${exponent} decimal places`}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[color:var(--founder-muted-foreground)]">
            The base-currency entry is what new workspaces receive immediately.
            Other currencies stay ready if the platform default currency
            changes.
          </p>

          <Button
            size="sm"
            className="h-9 text-sm"
            onClick={handleSave}
            disabled={isPending || !hasChanges}
          >
            {isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Save balances
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
