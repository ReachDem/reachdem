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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Pencil, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PricingPlanRow {
  code: string;
  name: string;
  priceMonthlyMinor: number;
  currency: string;
  status: "active" | "disabled";
  smsQuota: number | null;
  emailQuota: number | null;
}

interface PricingPlansEditorProps {
  plans: PricingPlanRow[];
  onUpdate: (plan: PricingPlanRow) => Promise<void>;
}

export function PricingPlansEditor({
  plans,
  onUpdate,
}: PricingPlansEditorProps) {
  const [list, setList] = useState(plans);
  const [editing, setEditing] = useState<PricingPlanRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    if (!editing) return;

    startTransition(async () => {
      await onUpdate(editing);
      setList((previous) =>
        previous.map((plan) => (plan.code === editing.code ? editing : plan))
      );
      setEditing(null);
    });
  };

  const handleToggle = (plan: PricingPlanRow) => {
    const updated = {
      ...plan,
      status:
        plan.status === "active" ? ("disabled" as const) : ("active" as const),
    };

    startTransition(async () => {
      await onUpdate(updated);
      setList((previous) =>
        previous.map((current) =>
          current.code === plan.code ? updated : current
        )
      );
    });
  };

  return (
    <>
      <Card className="rounded-[26px] border border-white/6">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Pricing Plans</CardTitle>
          <CardDescription className="text-sm">
            Manage plan names, prices, quotas, and activation status
          </CardDescription>
          <p
            aria-live="polite"
            className="text-sm text-[color:var(--founder-muted-foreground)]"
          >
            {list.length.toLocaleString()} plan{list.length === 1 ? "" : "s"}{" "}
            configured
          </p>
        </CardHeader>

        <CardContent className="p-0 sm:p-4">
          <div className="w-full overflow-hidden">
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="min-w-[800px]">
                <Table className="table-fixed border-separate border-spacing-0 [&_tr:not(:last-child)_td]:border-b">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="border-border bg-muted/50 relative h-11 border-y px-3 text-left font-medium select-none first:rounded-l-lg first:border-l first:pl-6 last:rounded-r-lg last:border-r last:pr-6">
                        Plan
                      </TableHead>
                      <TableHead className="border-border bg-muted/50 relative h-11 w-32 border-y px-3 text-left font-medium select-none">
                        Price / Month
                      </TableHead>
                      <TableHead className="border-border bg-muted/50 relative h-11 w-24 border-y px-3 text-left font-medium select-none">
                        SMS Quota
                      </TableHead>
                      <TableHead className="border-border bg-muted/50 relative h-11 w-24 border-y px-3 text-left font-medium select-none">
                        Email Quota
                      </TableHead>
                      <TableHead className="border-border bg-muted/50 relative h-11 w-20 border-y px-3 text-left font-medium select-none">
                        Status
                      </TableHead>
                      <TableHead className="border-border bg-muted/50 relative h-11 w-24 border-y px-3 text-right font-medium select-none last:rounded-r-lg last:border-r last:pr-6">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((plan) => (
                      <TableRow
                        key={plan.code}
                        className="hover:bg-muted/30 border-0 [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                      >
                        <TableCell className="px-3 py-3 first:pl-6 last:pr-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium capitalize">
                              {plan.name}
                            </span>
                            <span className="text-muted-foreground font-mono text-sm">
                              {plan.code}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3 font-mono text-sm">
                          {(plan.priceMonthlyMinor / 100).toLocaleString()}{" "}
                          {plan.currency}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-sm">
                          {plan.smsQuota?.toLocaleString() ?? "Unlimited"}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-sm">
                          {plan.emailQuota?.toLocaleString() ?? "Unlimited"}
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-sm capitalize",
                              plan.status === "active"
                                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                                : "border-muted text-muted-foreground"
                            )}
                          >
                            {plan.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 py-3 text-right last:pr-6">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              aria-label={`Edit ${plan.name} plan`}
                              onClick={() => setEditing({ ...plan })}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              aria-label={`${plan.status === "active" ? "Disable" : "Enable"} ${plan.name} plan`}
                              onClick={() => handleToggle(plan)}
                              title="Toggle status"
                              disabled={isPending}
                            >
                              {plan.status === "active" ? (
                                <ToggleRight
                                  className="h-4 w-4 text-emerald-400"
                                  aria-hidden="true"
                                />
                              ) : (
                                <ToggleLeft
                                  className="text-muted-foreground h-4 w-4"
                                  aria-hidden="true"
                                />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">
              Edit Plan — {editing?.name}
            </DialogTitle>
            <DialogDescription className="text-sm text-[color:var(--founder-muted-foreground)]">
              Update pricing and quotas for this founder-managed plan.
            </DialogDescription>
          </DialogHeader>

          {editing ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="plan-name" className="text-sm">
                  Plan Name
                </Label>
                <Input
                  id="plan-name"
                  name="plan-name"
                  autoComplete="off"
                  className="h-9 text-sm"
                  value={editing.name}
                  onChange={(event) =>
                    setEditing({ ...editing, name: event.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="plan-price" className="text-sm">
                  Price / Month (minor units)
                </Label>
                <Input
                  id="plan-price"
                  name="plan-price"
                  className="h-9 text-sm"
                  type="number"
                  value={editing.priceMonthlyMinor}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      priceMonthlyMinor: Number(event.target.value),
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="plan-sms-quota" className="text-sm">
                    SMS Quota (blank = unlimited)
                  </Label>
                  <Input
                    id="plan-sms-quota"
                    name="plan-sms-quota"
                    className="h-9 text-sm"
                    type="number"
                    placeholder="Unlimited"
                    value={editing.smsQuota ?? ""}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        smsQuota: event.target.value
                          ? Number(event.target.value)
                          : null,
                      })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="plan-email-quota" className="text-sm">
                    Email Quota
                  </Label>
                  <Input
                    id="plan-email-quota"
                    name="plan-email-quota"
                    className="h-9 text-sm"
                    type="number"
                    placeholder="Unlimited"
                    value={editing.emailQuota ?? ""}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        emailQuota: event.target.value
                          ? Number(event.target.value)
                          : null,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-sm"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-9 text-sm"
              onClick={handleSave}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2
                  className="mr-1.5 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
