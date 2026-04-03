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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Star, MessageSquare } from "lucide-react";
import type { FeedbackRow, FeedbackStatus } from "@/lib/founder-admin/types";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  new: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  reviewed: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  archived: "text-muted-foreground border-muted bg-muted/10",
};

interface FeedbackListProps {
  feedbacks: FeedbackRow[];
}

export function FeedbackList({ feedbacks }: FeedbackListProps) {
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">(
    "all"
  );
  const [query, setQuery] = useState("");

  const filtered = feedbacks.filter((f) => {
    const matchStatus = statusFilter === "all" || f.status === statusFilter;
    const matchQuery =
      !query ||
      f.message.toLowerCase().includes(query.toLowerCase()) ||
      (f.organizationName ?? "").toLowerCase().includes(query.toLowerCase());
    return matchStatus && matchQuery;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <MessageSquare className="h-5 w-5" />
            Customer Feedback
          </CardTitle>
          <div className="flex gap-2">
            <div className="relative min-w-[160px] flex-1">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-5 w-5" />
              <Input
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 pl-8 text-base"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value ?? "all")}
            >
              <SelectTrigger className="h-9 w-[110px] text-base">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-32 text-base">Source</TableHead>
              <TableHead className="text-base">Customer</TableHead>
              <TableHead className="text-base">Message</TableHead>
              <TableHead className="w-16 text-base">Rating</TableHead>
              <TableHead className="w-24 text-base">Status</TableHead>
              <TableHead className="w-28 text-base">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground h-24 text-center text-base"
                >
                  No feedback found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((f) => (
                <TableRow key={f.id} className="hover:bg-muted/30">
                  <TableCell className="text-muted-foreground text-base capitalize">
                    {f.source}
                  </TableCell>
                  <TableCell className="text-base font-medium">
                    {f.organizationName ?? f.email ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate text-base">{f.message}</p>
                  </TableCell>
                  <TableCell>
                    {f.rating != null ? (
                      <span className="flex items-center gap-0.5 text-base text-amber-400">
                        <Star className="h-3 w-3 fill-amber-400" />
                        {f.rating}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-base">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-base", STATUS_COLORS[f.status])}
                    >
                      {f.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-base">
                    {new Date(f.createdAt).toLocaleDateString("en-US", {
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
      </CardContent>
    </Card>
  );
}
