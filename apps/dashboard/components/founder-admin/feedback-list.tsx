"use client";

import { useId, useState } from "react";
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
import { Label } from "@/components/ui/label";
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
  const searchId = useId();

  const filtered = feedbacks.filter((feedback) => {
    const matchStatus =
      statusFilter === "all" || feedback.status === statusFilter;
    const matchQuery =
      !query ||
      feedback.message.toLowerCase().includes(query.toLowerCase()) ||
      (feedback.organizationName ?? "")
        .toLowerCase()
        .includes(query.toLowerCase());

    return matchStatus && matchQuery;
  });

  return (
    <Card className="rounded-[26px] border border-white/6">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <MessageSquare className="h-5 w-5" aria-hidden="true" />
              Customer Feedback
            </CardTitle>
            <p
              aria-live="polite"
              className="text-sm text-[color:var(--founder-muted-foreground)]"
            >
              {filtered.length.toLocaleString()} feedback item
              {filtered.length === 1 ? "" : "s"} match the current view
            </p>
          </div>

          <div className="flex gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Label htmlFor={searchId} className="sr-only">
                Search customer feedback
              </Label>
              <Search
                className="text-muted-foreground absolute top-2.5 left-2.5 h-5 w-5"
                aria-hidden="true"
              />
              <Input
                id={searchId}
                name="feedback-search"
                type="search"
                autoComplete="off"
                inputMode="search"
                placeholder="Search…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-9 pl-8 text-sm"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value ?? "all")}
            >
              <SelectTrigger
                aria-label="Filter feedback by status"
                className="h-9 w-[120px] text-sm"
              >
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
              filtered.map((feedback) => (
                <TableRow key={feedback.id} className="hover:bg-muted/30">
                  <TableCell className="text-muted-foreground text-base capitalize">
                    {feedback.source}
                  </TableCell>
                  <TableCell className="text-base font-medium">
                    {feedback.organizationName ?? feedback.email ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="line-clamp-2 text-sm leading-6 whitespace-normal">
                      {feedback.message}
                    </p>
                  </TableCell>
                  <TableCell>
                    {feedback.rating != null ? (
                      <span className="flex items-center gap-0.5 text-base text-amber-400">
                        <Star
                          className="h-3 w-3 fill-amber-400"
                          aria-hidden="true"
                        />
                        {feedback.rating}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-base">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-base",
                        STATUS_COLORS[feedback.status]
                      )}
                    >
                      {feedback.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-base">
                    {new Date(feedback.createdAt).toLocaleDateString("en-US", {
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
