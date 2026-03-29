"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  Play,
  RefreshCw,
  Search,
  Trash2,
  Plus,
  Megaphone,
} from "lucide-react";
import { toast } from "sonner";

import type { Campaign } from "@/actions/campaigns";
import { deleteCampaign, launchCampaign } from "@/actions/campaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

interface CampaignStatsSnapshot {
  audienceSize: number;
  pendingCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  resolvedStatus: Campaign["status"];
}

interface WorkerStatusSnapshot {
  reachable: boolean;
  healthy: boolean;
  environment?: string;
  queues?: string[];
  error?: string;
  checkedAt: string;
}

const isDeveloperMode = process.env.NODE_ENV === "development";

function getEffectiveCampaignStatus(
  campaign: Campaign,
  stats?: CampaignStatsSnapshot | null
) {
  if (isScheduledCampaign(campaign)) {
    return "scheduled" as const;
  }

  return stats?.resolvedStatus ?? campaign.status;
}

function isScheduledCampaign(campaign: Campaign) {
  return (
    campaign.status === "draft" &&
    Boolean(campaign.scheduledAt) &&
    new Date(campaign.scheduledAt as Date | string).getTime() > Date.now()
  );
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [workerStatus, setWorkerStatus] = useState<WorkerStatusSnapshot | null>(
    null
  );
  const [campaignStats, setCampaignStats] = useState<
    Record<string, CampaignStatsSnapshot>
  >({});

  // Filter and paginated logic
  const filteredCampaigns = initialCampaigns.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);
  const paginatedCampaigns = filteredCampaigns.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  async function refreshCampaignSignals(showSpinner = false) {
    if (showSpinner) {
      setIsRefreshing(true);
    }

    try {
      const nonDraftCampaigns = paginatedCampaigns.filter(
        (campaign) => campaign.status !== "draft"
      );

      const [workerResponse, ...statsResponses] = await Promise.all([
        fetch("/api/v1/workers/status", { cache: "no-store" }),
        ...nonDraftCampaigns.map((campaign) =>
          fetch(`/api/v1/campaigns/${campaign.id}/stats`, {
            cache: "no-store",
          })
        ),
      ]);

      const workerPayload =
        (await workerResponse.json()) as WorkerStatusSnapshot;
      setWorkerStatus(workerPayload);

      const nextStats: Record<string, CampaignStatsSnapshot> = {};
      await Promise.all(
        statsResponses.map(async (response, index) => {
          if (!response.ok) return;
          const stats = (await response.json()) as CampaignStatsSnapshot;
          nextStats[nonDraftCampaigns[index].id] = stats;
        })
      );

      if (Object.keys(nextStats).length > 0) {
        setCampaignStats((current) => ({ ...current, ...nextStats }));
      }
    } catch {
      // Keep current UI state if a polling cycle fails.
    } finally {
      if (showSpinner) {
        setIsRefreshing(false);
      }
    }
  }

  useEffect(() => {
    void refreshCampaignSignals();
  }, [currentPage, search]);

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
      void refreshCampaignSignals(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to launch campaign");
    } finally {
      setIsLaunching(false);
      setCampaignToLaunch(null);
    }
  };

  const getStatusBadge = (campaign: Campaign) => {
    const effectiveStatus = getEffectiveCampaignStatus(
      campaign,
      campaignStats[campaign.id]
    );

    if (effectiveStatus === "scheduled") {
      return (
        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
          Scheduled
        </Badge>
      );
    }

    switch (effectiveStatus) {
      case "draft":
        return (
          <Badge variant="outline" className="text-slate-500">
            Draft
          </Badge>
        );
      case "running":
        return (
          <Badge
            variant="outline"
            className="animate-pulse border-orange-500 text-orange-500 hover:bg-transparent"
          >
            Running
          </Badge>
        );
      case "partial":
        return (
          <Badge
            variant="secondary"
            className="bg-red-100 text-red-700 hover:bg-red-100"
          >
            Partial
          </Badge>
        );
      case "completed":
        return (
          <Badge
            variant="outline"
            className="px-2 px-3 font-light text-green-900 hover:bg-transparent dark:text-green-50"
          >
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
            Failed
          </Badge>
        );
      case "expired":
        return (
          <Badge className="bg-red-700 text-white hover:bg-red-800">
            Expired
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="capitalize">
            {effectiveStatus}
          </Badge>
        );
    }
  };

  const getChannelBadge = (channel: string) => {
    switch (channel.toLowerCase()) {
      case "email":
        return (
          <Badge
            variant="outline"
            className="text-blue-700 hover:bg-blue-100 dark:text-blue-200"
          >
            Email
          </Badge>
        );
      case "sms":
        return (
          <Badge
            variant="outline"
            className="text-amber-700 hover:bg-amber-100 dark:text-amber-100"
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

  const getDeliverySummary = (campaign: Campaign) => {
    const stats = campaignStats[campaign.id];
    const effectiveStatus = getEffectiveCampaignStatus(campaign, stats);

    if (effectiveStatus === "draft" || effectiveStatus === "scheduled") {
      return (
        <span className="text-muted-foreground text-xs">Not launched yet</span>
      );
    }

    if (!stats) {
      return (
        <span className="text-muted-foreground text-xs">
          Waiting for stats...
        </span>
      );
    }

    if (stats.audienceSize === 0) {
      return (
        <div className="flex min-w-[180px] flex-col items-center gap-2 text-center">
          <div className="relative w-[90px]">
            <Progress
              value={0}
              className="border-border/60 h-6 w-[90px] border border-dashed bg-transparent"
              indicatorClassName="bg-transparent"
            />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2">
              <div className="text-muted-foreground flex w-full items-center justify-center text-[10px] font-medium">
                0/0
              </div>
            </div>
          </div>
          <span className="text-muted-foreground text-xs">Audience 0</span>
        </div>
      );
    }

    if (stats.audienceSize > 0) {
      const unsuccessfulCount = stats.failedCount + stats.skippedCount;
      const sentWidth = Math.max(
        0,
        Math.min(100, (stats.sentCount / stats.audienceSize) * 100)
      );
      const pendingWidth = Math.max(
        0,
        Math.min(100, (stats.pendingCount / stats.audienceSize) * 100)
      );
      const unsuccessfulWidth = Math.max(
        0,
        Math.min(100, (unsuccessfulCount / stats.audienceSize) * 100)
      );
      const trailingWidth =
        effectiveStatus === "running" ? pendingWidth : unsuccessfulWidth;
      const trailingColor =
        effectiveStatus === "running" ? "bg-orange-500" : "bg-orange-300/80";

      return (
        <div className="flex min-w-[180px] flex-col items-center gap-2 text-center">
          <div className="relative w-[90px]">
            <Progress
              value={sentWidth}
              className="bg-muted h-6 w-[90px]"
              indicatorClassName="bg-emerald-500"
            />
            {trailingWidth > 0 ? (
              <div
                className={`absolute top-0 h-6 rounded-r-full ${trailingColor}`}
                style={{
                  left: `${sentWidth}%`,
                  width: `${Math.max(0, Math.min(100 - sentWidth, trailingWidth))}%`,
                }}
              />
            ) : null}
            <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2">
              <div className="flex w-full items-center justify-center gap-1 text-[10px] font-medium text-white">
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                <span>
                  {stats.sentCount}/{stats.audienceSize}
                </span>
              </div>
            </div>
          </div>
          {effectiveStatus === "running" ? (
            <span className="text-muted-foreground text-xs">
              {stats.pendingCount} remaining
            </span>
          ) : unsuccessfulCount > 0 ? (
            <span className="text-muted-foreground text-xs">
              {unsuccessfulCount} unsuccessful
            </span>
          ) : null}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1 text-xs">
        <span className="font-medium">
          {stats.sentCount} sent / {stats.failedCount + stats.skippedCount}{" "}
          failed
        </span>
        <span className="text-muted-foreground">
          Audience {stats.audienceSize}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Show empty state if no campaigns at all */}
      {initialCampaigns.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 border-none py-4">
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

          <div className="w-full max-w-[100vw] overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%] min-w-[200px] px-4">
                    Name
                  </TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Delivery</TableHead>
                  <TableHead>Updated at</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="">
                {paginatedCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-muted-foreground h-32 text-center"
                    >
                      No campaigns found matching &quot;{search}&quot;.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCampaigns.map((campaign) => (
                    <TableRow key={campaign.id} className="group">
                      <TableCell className="px-4 font-medium">
                        <div className="flex flex-col gap-1">
                          <Link
                            href={`/campaigns/${campaign.id}`}
                            className="hover:underline"
                          >
                            {campaign.name}
                          </Link>
                          {campaign.description && (
                            <span className="text-muted-foreground line-clamp-1 text-xs">
                              {campaign.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getChannelBadge(campaign.channel)}</TableCell>
                      <TableCell>{getStatusBadge(campaign)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          {getDeliverySummary(campaign)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {format(
                              new Date(campaign.updatedAt),
                              "MMM d, yyyy"
                            )}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {format(
                              new Date(campaign.updatedAt),
                              "HH:mm:ss zzz"
                            )}
                          </span>
                          {isScheduledCampaign(campaign) &&
                            campaign.scheduledAt && (
                              <span className="text-xs text-blue-700">
                                Scheduled for{" "}
                                {format(
                                  new Date(campaign.scheduledAt),
                                  "dd.MM.yyyy 'at' HH:mm"
                                )}
                              </span>
                            )}
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
                          <DropdownMenuContent
                            align="end"
                            className="w-[160px]"
                          >
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/campaigns/${campaign.id}`}
                                className="cursor-pointer"
                              >
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/campaigns/${campaign.id}/edit`}
                                className="cursor-pointer"
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                {campaign.status === "draft" ? "Edit" : "View"}
                              </Link>
                            </DropdownMenuItem>

                            {campaign.status === "draft" &&
                              !isScheduledCampaign(campaign) && (
                                <DropdownMenuItem
                                  className="cursor-pointer text-emerald-600 focus:text-emerald-700"
                                  onClick={() => setCampaignToLaunch(campaign)}
                                >
                                  <Play className="mr-2 h-4 w-4" />
                                  Launch
                                </DropdownMenuItem>
                              )}

                            {isDeveloperMode && (
                              <>
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
        </>
      )}

      {initialCampaigns.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 px-4 pt-4 text-sm">
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 py-16">
      <div className="bg-primary/10 text-primary rounded-full p-4">
        <Megaphone className="h-8 w-8" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold">No campaigns yet</h3>
        <p className="text-muted-foreground mt-1 max-w-md text-sm">
          Get started by creating your first campaign to reach your audience via
          SMS or Email.
        </p>
      </div>
      <Link href="/campaigns/new">
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create your first campaign
        </Button>
      </Link>
    </div>
  );
}
