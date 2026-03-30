"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  MessageSquareText,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

import type { Campaign } from "@/actions/campaigns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CampaignsTableProps {
  campaigns: Campaign[];
  onEdit?: (campaign: Campaign) => void;
  onView?: (campaign: Campaign) => void;
  onDelete?: (campaign: Campaign) => void;
}

const pillBadgeClassName = "text-muted-foreground gap-1.5 px-1.5";

export function CampaignsTable({
  campaigns,
  onEdit,
  onView,
  onDelete,
}: CampaignsTableProps) {
  const getStatusBadge = (status: Campaign["status"]) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="outline" className={pillBadgeClassName}>
            <Loader2 className="text-muted-foreground h-3.5 w-3.5" />
            Draft
          </Badge>
        );
      case "running":
        return (
          <Badge variant="outline" className={pillBadgeClassName}>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
            In Progress
          </Badge>
        );
      case "partial":
        return (
          <Badge variant="outline" className={pillBadgeClassName}>
            <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
            Partial
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className={pillBadgeClassName}>
            <CheckCircle2 className="text-background h-3.5 w-3.5 fill-emerald-500 dark:text-black" />
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className={pillBadgeClassName}>
            <AlertCircle className="h-3.5 w-3.5 text-orange-400" />
            Failed
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="outline" className={pillBadgeClassName}>
            <Clock3 className="h-3.5 w-3.5 text-red-500" />
            Expired
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className={`${pillBadgeClassName} capitalize`}
          >
            {status}
          </Badge>
        );
    }
  };

  const getChannelBadge = (channel: string) => {
    switch (channel.toLowerCase()) {
      case "email":
        return (
          <Badge variant="outline" className={pillBadgeClassName}>
            <Mail className="h-3.5 w-3.5 text-blue-500" />
            Email
          </Badge>
        );
      case "sms":
        return (
          <Badge variant="outline" className={pillBadgeClassName}>
            <MessageSquareText className="h-3.5 w-3.5 text-green-600" />
            SMS
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className={`${pillBadgeClassName} capitalize`}
          >
            {channel}
          </Badge>
        );
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[30%] min-w-[200px]">Name</TableHead>
          <TableHead>Channel</TableHead>
          <TableHead className="text-center">Status</TableHead>
          <TableHead>Updated at</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {campaigns.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={5}
              className="text-muted-foreground h-32 text-center"
            >
              No campaigns found.
            </TableCell>
          </TableRow>
        ) : (
          campaigns.map((campaign) => {
            // Redirect to edit page for drafts, details page for others
            const campaignUrl =
              campaign.status === "draft"
                ? `/campaigns/${campaign.id}/edit`
                : `/campaigns/${campaign.id}`;

            return (
              <TableRow key={campaign.id} className="group">
                <TableCell className="font-medium">
                  <Link href={campaignUrl} className="hover:underline">
                    {campaign.name}
                  </Link>
                </TableCell>
                <TableCell>{getChannelBadge(campaign.channel)}</TableCell>
                <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm">
                      {format(new Date(campaign.updatedAt), "MMM d, yyyy")}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {format(new Date(campaign.updatedAt), "HH:mm")}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px]">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onView?.(campaign)}
                        asChild
                      >
                        <Link href={campaignUrl} className="cursor-pointer">
                          {campaign.status === "draft" ? "Edit" : "View"}
                        </Link>
                      </DropdownMenuItem>
                      {campaign.status === "draft" && (
                        <DropdownMenuItem
                          onClick={() => onEdit?.(campaign)}
                          asChild
                        >
                          <Link
                            href={`/campaigns/${campaign.id}/edit`}
                            className="cursor-pointer"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {campaign.status !== "draft" && (
                        <DropdownMenuItem
                          onClick={() => onEdit?.(campaign)}
                          asChild
                        >
                          <Link
                            href={`/campaigns/${campaign.id}/edit`}
                            className="cursor-pointer"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {campaign.status === "draft" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            className="cursor-pointer"
                            onClick={() => onDelete?.(campaign)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
