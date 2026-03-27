"use client";

import { useState } from "react";
import { ExternalLink, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TrackedLink {
  id: string;
  slug: string;
  targetUrl: string;
  shortUrl: string;
  totalClicks: number | null;
  uniqueClicks: number | null;
  status: "active" | "disabled";
  createdAt: Date | string;
}

interface TrackedLinksTableProps {
  links: TrackedLink[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function TrackedLinksTable({
  links,
  onRefresh,
  isRefreshing = false,
}: TrackedLinksTableProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (links.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tracked Links</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center text-sm">
            No tracked links found for this campaign.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Tracked Links</CardTitle>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Short URL</TableHead>
              <TableHead>Target URL</TableHead>
              <TableHead className="text-center">Total Clicks</TableHead>
              <TableHead className="text-center">Unique Clicks</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.map((link) => (
              <TableRow key={link.id}>
                <TableCell className="font-mono text-sm">
                  <div className="flex items-center gap-2">
                    <span className="max-w-[200px] truncate">
                      {link.shortUrl}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(link.shortUrl)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground max-w-[300px] truncate text-sm">
                      {link.targetUrl}
                    </span>
                    <a
                      href={link.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-medium">{link.totalClicks ?? "-"}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-medium">
                    {link.uniqueClicks ?? "-"}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant={link.status === "active" ? "default" : "secondary"}
                  >
                    {link.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(link.shortUrl)}
                  >
                    Copy
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
