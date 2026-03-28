"use client";

import { useState } from "react";
import { Search, RefreshCw, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

interface CampaignTarget {
  id: string;
  contactId: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  resolvedTo: string;
  status: "pending" | "sent" | "failed" | "skipped";
  messageId: string | null;
  createdAt: Date | string;
}

interface CampaignTargetsTableProps {
  targets: CampaignTarget[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSearch?: (query: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function CampaignTargetsTable({
  targets,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onSearch,
  onRefresh,
  isRefreshing = false,
}: CampaignTargetsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const getStatusBadge = (status: CampaignTarget["status"]) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-emerald-500">Sent</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "skipped":
        return <Badge variant="secondary">Skipped</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="inline-flex items-center gap-2 font-medium">
            Message Targets{" "}
            <Badge variant="outline" className="py- rounded-full px-4">
              {totalCount}
            </Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {onSearch && (
          <div className="relative max-w-sm">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              placeholder="Search contacts..."
              className="h-9 pl-9 text-sm"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Email / Phone</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Message ID</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground h-32 text-center"
                  >
                    {searchQuery
                      ? `No targets found matching "${searchQuery}"`
                      : "No targets found for this campaign"}
                  </TableCell>
                </TableRow>
              ) : (
                targets.map((target) => (
                  <TableRow key={target.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/contacts/${target.contactId}`}
                        className="hover:underline"
                      >
                        {target.contactName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        {target.contactEmail && (
                          <span className="text-muted-foreground">
                            {target.contactEmail}
                          </span>
                        )}
                        {target.contactPhone && (
                          <span className="text-muted-foreground font-mono">
                            {target.contactPhone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(target.status)}
                    </TableCell>
                    <TableCell className="text-center">
                      {target.messageId ? (
                        <span className="font-mono text-xs">
                          {target.messageId.slice(0, 8)}...
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/contacts/${target.contactId}`}>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-muted-foreground text-sm">
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
              targets
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="text-sm">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
