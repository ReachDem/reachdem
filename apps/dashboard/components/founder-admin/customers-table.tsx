"use client";

import { useId, useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CustomerTableRow {
  id: string;
  name: string;
  ownerEmail: string;
  planCode: string;
  creditBalance: number;
  workspaceVerificationStatus:
    | "not_submitted"
    | "pending"
    | "verified"
    | "rejected";
  websiteUrl: string | null;
  idDocumentKey: string | null;
  businessDocumentKey: string | null;
  activated: boolean;
  lastPaymentAt: Date | null;
  createdAt: Date;
}

interface CustomersTableProps {
  customers: CustomerTableRow[];
}

const PLAN_COLORS: Record<string, string> = {
  free: "text-muted-foreground border-muted",
  basic: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  growth: "text-violet-400 border-violet-400/30 bg-violet-400/10",
  pro: "text-amber-400 border-amber-400/30 bg-amber-400/10",
};

export function CustomersTable({ customers }: CustomersTableProps) {
  const [query, setQuery] = useState("");
  const searchId = useId();

  const filtered = customers.filter(
    (customer) =>
      !query ||
      customer.name.toLowerCase().includes(query.toLowerCase()) ||
      customer.ownerEmail.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Card className="overflow-hidden rounded-[26px] border border-white/6">
      <CardHeader className="border-b border-white/6 bg-white/[0.02] pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Users className="h-5 w-5" aria-hidden="true" />
              All Customers
            </CardTitle>
            <p
              aria-live="polite"
              className="text-sm text-[color:var(--founder-muted-foreground)]"
            >
              {filtered.length.toLocaleString()} of{" "}
              {customers.length.toLocaleString()} workspace
              {customers.length === 1 ? "" : "s"} shown
            </p>
          </div>

          <div className="relative min-w-[220px]">
            <Label htmlFor={searchId} className="sr-only">
              Search customers
            </Label>
            <Search
              className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4"
              aria-hidden="true"
            />
            <Input
              id={searchId}
              name="customer-search"
              type="search"
              autoComplete="off"
              inputMode="search"
              placeholder="Search by name or email…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-9 pl-8 text-sm"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 sm:p-4">
        <div className="w-full overflow-hidden">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="min-w-[800px]">
              <Table className="table-fixed border-separate border-spacing-0 [&_tr:not(:last-child)_td]:border-b">
                <TableCaption className="sr-only">
                  Customer workspaces with plan, activation, verification,
                  payment, and joined date.
                </TableCaption>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="border-border bg-muted/50 relative h-11 border-y px-3 text-left font-medium select-none first:rounded-l-lg first:border-l first:pl-6 last:rounded-r-lg last:border-r last:pr-6">
                      Workspace
                    </TableHead>
                    <TableHead className="border-border bg-muted/50 relative h-11 border-y px-3 text-left font-medium select-none">
                      Owner Email
                    </TableHead>
                    <TableHead className="border-border bg-muted/50 relative h-11 w-20 border-y px-3 text-left font-medium select-none">
                      Plan
                    </TableHead>
                    <TableHead className="border-border bg-muted/50 relative h-11 w-24 border-y px-3 text-left font-medium select-none">
                      Activated
                    </TableHead>
                    <TableHead className="border-border bg-muted/50 relative h-11 w-32 border-y px-3 text-left font-medium select-none">
                      Status
                    </TableHead>
                    <TableHead className="border-border bg-muted/50 relative h-11 w-32 border-y px-3 text-left font-medium select-none">
                      Last Payment
                    </TableHead>
                    <TableHead className="border-border bg-muted/50 relative h-11 w-32 border-y px-3 text-left font-medium select-none last:rounded-r-lg last:border-r last:pr-6">
                      Joined
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow className="border-0 [&>td:first-child]:rounded-tl-lg [&>td:first-child]:rounded-bl-lg [&>td:last-child]:rounded-tr-lg [&>td:last-child]:rounded-br-lg">
                      <TableCell
                        colSpan={7}
                        className="text-muted-foreground h-24 px-4 text-center text-sm"
                      >
                        No customers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((customer) => (
                      <TableRow
                        key={customer.id}
                        className="hover:bg-muted/30 border-0 [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                      >
                        <TableCell className="px-3 py-3 font-medium first:pl-6 last:pr-6">
                          {customer.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[16rem] truncate px-3 py-3">
                          {customer.ownerEmail}
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "capitalize",
                              PLAN_COLORS[customer.planCode] ?? ""
                            )}
                          >
                            {customer.planCode}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              customer.activated
                                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                                : "border-muted text-muted-foreground"
                            )}
                          >
                            {customer.activated ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground px-3 py-3 capitalize">
                          {customer.workspaceVerificationStatus.replace(
                            "_",
                            " "
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground px-3 py-3">
                          {customer.lastPaymentAt
                            ? new Date(
                                customer.lastPaymentAt
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground px-3 py-3 last:pr-6">
                          {new Date(customer.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
