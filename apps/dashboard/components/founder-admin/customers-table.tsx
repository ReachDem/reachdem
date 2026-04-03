"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";

// These types come from the DB query in the page — lightweight
export interface CustomerTableRow {
  id: string;
  name: string;
  ownerEmail: string;
  planCode: string;
  creditBalance: number;
  workspaceVerificationStatus: string;
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

  const filtered = customers.filter(
    (c) =>
      !query ||
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.ownerEmail.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/20 border-b pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Users className="h-5 w-5" />
            All Customers
          </CardTitle>
          <div className="relative min-w-[200px]">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              placeholder="Search by name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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
                    filtered.map((c) => (
                      <TableRow
                        key={c.id}
                        className="hover:bg-muted/30 border-0 [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                      >
                        <TableCell className="px-3 py-3 font-medium first:pl-6 last:pr-6">
                          {c.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground px-3 py-3">
                          {c.ownerEmail}
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "capitalize",
                              PLAN_COLORS[c.planCode] ?? ""
                            )}
                          >
                            {c.planCode}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              c.activated
                                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                                : "border-muted text-muted-foreground"
                            )}
                          >
                            {c.activated ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground px-3 py-3 capitalize">
                          {c.workspaceVerificationStatus.replace("_", " ")}
                        </TableCell>
                        <TableCell className="text-muted-foreground px-3 py-3">
                          {c.lastPaymentAt
                            ? new Date(c.lastPaymentAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )
                            : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground px-3 py-3 last:pr-6">
                          {new Date(c.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
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
