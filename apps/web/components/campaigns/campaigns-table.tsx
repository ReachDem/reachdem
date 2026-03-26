"use client";

import Link from "next/link";
import { format } from "date-fns";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

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
          <Badge variant="outline" className="text-slate-500">
            Draft
          </Badge>
        );
      case "running":
        return (
          <Badge className="bg-emerald-500 hover:bg-emerald-600">Running</Badge>
        );
      case "partial":
        return (
          <Badge
            variant="secondary"
            className="bg-amber-50 text-amber-700 hover:bg-amber-100"
          >
            Partial
          </Badge>
        );
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return (
          <Badge variant="outline" className="capitalize">
            {status}
          </Badge>
        );
    }
  };

  const getChannelBadge = (channel: string) => {
    switch (channel.toLowerCase()) {
      case "email":
        return (
          <Badge
            variant="secondary"
            className="bg-blue-50 text-blue-700 hover:bg-blue-100"
          >
            Email
          </Badge>
        );
      case "sms":
        return (
          <Badge
            variant="secondary"
            className="bg-amber-50 text-amber-700 hover:bg-amber-100"
          >
            SMS
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="capitalize">
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
          <TableHead>Status</TableHead>
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
          campaigns.map((campaign) => (
            <TableRow key={campaign.id} className="group">
              <TableCell className="font-medium">
                <Link
                  href={`/campaigns/${campaign.id}`}
                  className="hover:underline"
                >
                  {campaign.name}
                </Link>
              </TableCell>
              <TableCell>{getChannelBadge(campaign.channel)}</TableCell>
              <TableCell>{getStatusBadge(campaign.status)}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {format(new Date(campaign.updatedAt), "MMM d, yyyy")}
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
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="cursor-pointer"
                      >
                        View
                      </Link>
                    </DropdownMenuItem>
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
          ))
        )}
      </TableBody>
    </Table>
  );
}
