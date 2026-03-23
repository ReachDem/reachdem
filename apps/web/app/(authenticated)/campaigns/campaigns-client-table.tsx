"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { MoreHorizontal, Pencil, Play, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { Campaign } from "@/actions/campaigns";
import { deleteCampaign, launchCampaign } from "@/actions/campaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CampaignsClientTableProps {
  initialCampaigns: Campaign[];
}

export function CampaignsClientTable({
  initialCampaigns,
}: CampaignsClientTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dialog state
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(
    null
  );
  const [campaignToLaunch, setCampaignToLaunch] = useState<Campaign | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  // Filter and paginated logic
  const filteredCampaigns = initialCampaigns.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);
  const paginatedCampaigns = filteredCampaigns.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDelete = async () => {
    if (!campaignToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCampaign(campaignToDelete.id);
      toast.success("Campaign deleted successfully");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete campaign");
    } finally {
      setIsDeleting(false);
      setCampaignToDelete(null);
    }
  };

  const handleLaunch = async () => {
    if (!campaignToLaunch) return;
    setIsLaunching(true);
    try {
      await launchCampaign(campaignToLaunch.id);
      toast.success("Campaign launched successfully");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to launch campaign");
    } finally {
      setIsLaunching(false);
      setCampaignToLaunch(null);
    }
  };

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
      case "push":
        return (
          <Badge
            variant="secondary"
            className="bg-purple-50 text-purple-700 hover:bg-purple-100"
          >
            Push
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
    <div className="w-full">
      <div className="flex items-center border-b p-4">
        <div className="relative w-full max-w-sm">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            placeholder="Search campaigns..."
            className="bg-muted/50 w-full border-none pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <div className="w-full max-w-[100vw] overflow-x-auto">
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
            {paginatedCampaigns.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground h-32 text-center"
                >
                  No campaigns found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedCampaigns.map((campaign) => (
                <TableRow key={campaign.id} className="group">
                  <TableCell className="font-medium">
                    <div className="flex flex-col gap-1">
                      <span>{campaign.name}</span>
                      {campaign.description && (
                        <span className="text-muted-foreground line-clamp-1 text-xs">
                          {campaign.description}
                        </span>
                      )}
                    </div>
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
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/campaigns/${campaign.id}/edit`}
                            className="cursor-pointer"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            {campaign.status === "draft" ? "Edit" : "View"}
                          </Link>
                        </DropdownMenuItem>

                        {campaign.status === "draft" && (
                          <>
                            <DropdownMenuItem
                              className="cursor-pointer text-emerald-600 focus:text-emerald-700"
                              onClick={() => setCampaignToLaunch(campaign)}
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Launch
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive cursor-pointer"
                              onClick={() => setCampaignToDelete(campaign)}
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
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 border-t p-4 text-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-muted-foreground px-2">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!campaignToDelete}
        onOpenChange={(open) => !open && setCampaignToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the campaign{" "}
              <strong>{campaignToDelete?.name}</strong>. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Launch Confirmation */}
      <AlertDialog
        open={!!campaignToLaunch}
        onOpenChange={(open) => !open && setCampaignToLaunch(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Launch Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to launch <strong>{campaignToLaunch?.name}</strong>.
              The campaign will begin sending immediately. Are you sure you want
              to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLaunching}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={(e) => {
                e.preventDefault();
                handleLaunch();
              }}
              disabled={isLaunching}
            >
              {isLaunching ? "Launching..." : "Launch Campaign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
