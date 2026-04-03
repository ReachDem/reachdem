"use client";

import { useState, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type {
  FounderAdminLogLevel,
  PaginatedLogsResult,
} from "@/lib/founder-admin/types";
import { cn } from "@/lib/utils";

const LEVEL_COLORS: Record<FounderAdminLogLevel, string> = {
  debug: "text-slate-400 border-slate-400/30 bg-slate-400/10",
  info: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  warn: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  error: "text-red-400 border-red-400/30 bg-red-400/10",
};

interface SystemLogsTableProps {
  initialData: PaginatedLogsResult;
  onFetch: (params: {
    page: number;
    level?: FounderAdminLogLevel;
    category?: string;
    query?: string;
  }) => Promise<PaginatedLogsResult>;
  loading?: boolean;
}

export function SystemLogsTable({
  initialData,
  onFetch,
  loading = false,
}: SystemLogsTableProps) {
  const [data, setData] = useState(initialData);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const fetchPage = (
    page: number,
    overrides?: { level?: string; query?: string }
  ) => {
    const level =
      (overrides?.level ?? levelFilter) === "all"
        ? undefined
        : ((overrides?.level ?? levelFilter) as FounderAdminLogLevel);
    const q = overrides?.query ?? query;
    startTransition(async () => {
      const result = await onFetch({ page, level, query: q || undefined });
      setData(result);
    });
  };

  const handleLevelChange = (val: string | null) => {
    const nextLevel = val ?? "all";
    setLevelFilter(nextLevel);
    fetchPage(1, { level: nextLevel });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPage(1, { query });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-medium">System Logs</CardTitle>
          <div className="flex flex-wrap gap-2">
            {/* Search */}
            <form
              onSubmit={handleSearch}
              className="relative min-w-[180px] flex-1"
            >
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                placeholder="Search logs…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 pl-8 text-sm"
              />
            </form>
            {/* Level filter */}
            <Select value={levelFilter} onValueChange={handleLevelChange}>
              <SelectTrigger className="h-9 w-[110px] text-sm">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-4">
        <div
          className={cn(
            "w-full overflow-hidden transition-opacity",
            isPending && "opacity-60"
          )}
        >
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="min-w-[800px]">
              <Table className="table-fixed border-separate border-spacing-0 [&_tr:not(:last-child)_td]:border-b">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="border-border bg-muted/50 relative h-11 w-48 border-y px-3 text-left font-medium select-none first:rounded-l-lg first:border-l first:pl-6 last:rounded-r-lg last:border-r last:pr-6">
                      Timestamp
                    </TableHead>
                    <TableHead className="border-border bg-muted/50 relative h-11 w-24 border-y px-3 text-left font-medium select-none">
                      Level
                    </TableHead>
                    <TableHead className="border-border bg-muted/50 relative h-11 w-32 border-y px-3 text-left font-medium select-none">
                      Category
                    </TableHead>
                    <TableHead className="border-border bg-muted/50 relative h-11 border-y px-3 text-left font-medium select-none last:rounded-r-lg last:border-r last:pr-6">
                      Message
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.length === 0 ? (
                    <TableRow className="border-0 [&>td:first-child]:rounded-tl-lg [&>td:first-child]:rounded-bl-lg [&>td:last-child]:rounded-tr-lg [&>td:last-child]:rounded-br-lg">
                      <TableCell
                        colSpan={4}
                        className="text-muted-foreground h-32 px-4 text-center text-sm"
                      >
                        No logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className="hover:bg-muted/30 border-0 [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                      >
                        <TableCell className="text-muted-foreground px-3 py-3 font-mono first:pl-6 last:pr-6">
                          {new Date(row.timestamp).toLocaleString("en-US", {
                            month: "short",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <Badge
                            variant="outline"
                            className={cn("font-mono", LEVEL_COLORS[row.level])}
                          >
                            {row.level}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground px-3 py-3">
                          {row.category}
                        </TableCell>
                        <TableCell className="max-w-xs truncate px-3 py-3">
                          {row.message}
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

        {/* Pagination */}
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-muted-foreground text-sm">
            {data.total.toLocaleString()} total • page {data.page}/
            {data.totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={data.page <= 1 || isPending}
              onClick={() => fetchPage(data.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={data.page >= data.totalPages || isPending}
              onClick={() => fetchPage(data.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
