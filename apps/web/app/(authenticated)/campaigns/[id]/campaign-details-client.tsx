"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  MessageSquareText,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import type { Campaign } from "@/actions/campaigns";
import {
  getCampaignStats,
  getCampaignLinks,
  getCampaignTargets,
} from "@/actions/campaigns";
import { getCampaignAnalytics } from "@/actions/links";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { CampaignStatsCards } from "@/components/campaigns/campaign-stats-cards";
import { CampaignAnalyticsSection } from "@/components/campaigns/campaign-analytics-section";
import { TrackedLinksTable } from "@/components/campaigns/tracked-links-table";
import { CampaignTargetsTable } from "@/components/campaigns/campaign-targets-table";

interface CampaignDetailsClientProps {
  campaign: Campaign;
}

const pillBadgeClassName = "text-muted-foreground gap-1.5 px-1.5";

export function CampaignDetailsClient({
  campaign,
}: CampaignDetailsClientProps) {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [targets, setTargets] = useState<any>({
    targets: [],
    totalCount: 0,
    page: 1,
    pageSize: 50,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const loadData = async (showToast = false) => {
    setIsRefreshing(true);
    try {
      const [statsData, linksData, targetsData, analyticsData] =
        await Promise.all([
          getCampaignStats(campaign.id).catch(() => null),
          getCampaignLinks(campaign.id).catch(() => []),
          getCampaignTargets(campaign.id, {
            page: targets.page,
            pageSize: targets.pageSize,
          }).catch(() => ({
            targets: [],
            totalCount: 0,
            page: 1,
            pageSize: 50,
          })),
          getCampaignAnalytics(campaign.id).catch(() => null),
        ]);

      setStats(statsData);
      setLinks(linksData);
      setTargets(targetsData);
      setAnalyticsData(analyticsData);

      if (showToast) {
        toast.success("Data refreshed");
      }
    } catch (error) {
      console.error("Error loading campaign data:", error);
      if (showToast) {
        toast.error("Failed to refresh data");
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [campaign.id]);

  const handlePageChange = async (page: number) => {
    const targetsData = await getCampaignTargets(campaign.id, {
      page,
      pageSize: targets.pageSize,
    });
    setTargets(targetsData);
  };

  const handleSearch = async (query: string) => {
    const targetsData = await getCampaignTargets(campaign.id, {
      page: 1,
      pageSize: targets.pageSize,
      search: query,
    });
    setTargets(targetsData);
  };

  const getStatusBadge = () => {
    switch (campaign.status) {
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
            {campaign.status}
          </Badge>
        );
    }
  };

  const getChannelBadge = () => {
    switch (campaign.channel.toLowerCase()) {
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
          <Badge variant="outline" className={pillBadgeClassName}>
            {campaign.channel}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {campaign.name}
            </h1>
            {getStatusBadge()}
            {getChannelBadge()}
          </div>
          {campaign.description && (
            <p className="text-muted-foreground ml-1">{campaign.description}</p>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {/* {stats && <CampaignStatsCards stats={stats} />} */}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full space-y-6 border-b-0"
      >
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="overview">Overview & Delivery</TabsTrigger>
          <TabsTrigger value="preview">Message Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-6">
          {/* Analytics Charts - Above tabs */}
          <CampaignAnalyticsSection data={analyticsData} />

          <CampaignTargetsTable
            targets={targets.targets}
            totalCount={targets.totalCount}
            currentPage={targets.page}
            pageSize={targets.pageSize}
            onPageChange={handlePageChange}
            onSearch={handleSearch}
            onRefresh={() => loadData(true)}
            isRefreshing={isRefreshing}
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-0 space-y-6">
          <div className="bg-card text-card-foreground mx-auto w-full rounded-lg border p-6 shadow-sm md:p-10">
            <h3 className="mb-6 flex items-center gap-2 text-xl font-semibold">
              <Mail className="text-muted-foreground h-5 w-5" />
              Campaign Content Preview
            </h3>

            {campaign.channel === "sms" ? (
              <div className="flex justify-center py-10">
                <div className="relative mx-auto h-[600px] w-[300px] overflow-hidden rounded-[2.5rem] border-[14px] border-gray-800 bg-gray-900 shadow-2xl shadow-xl">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 z-20 h-[18px] w-[148px] -translate-x-1/2 rounded-b-[1rem] bg-gray-800"></div>
                  {/* Screen Content */}
                  <div className="flex h-[600px] w-full flex-col bg-gray-50 px-4 pt-12">
                    <div className="mb-4 border-b border-gray-200 pb-4 text-center">
                      <div className="flex items-center justify-center gap-2 font-semibold text-gray-900">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 font-bold text-gray-500">
                          R
                        </div>
                        {campaign.content?.senderId ||
                          campaign.content?.from ||
                          "Message"}
                      </div>
                    </div>

                    {/* Bubble */}
                    <div className="max-w-[85%] self-start rounded-2xl rounded-tl-sm bg-gray-200 px-4 py-3 text-sm whitespace-pre-wrap text-gray-900 shadow-sm">
                      {campaign.content?.text || "No preview available."}
                    </div>

                    <div className="mt-auto flex flex-col items-center pb-4">
                      <p className="mb-2 text-xs text-gray-400">SMS Message</p>
                      {/* Home indicator */}
                      <div className="h-1 w-1/2 rounded-full bg-gray-300"></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : campaign.channel === "email" ? (
              <div className="border-muted-foreground/20 flex min-h-[600px] flex-col overflow-hidden rounded-xl border bg-white shadow-sm">
                <div className="bg-muted flex items-center justify-between border-b px-4 py-3 text-sm">
                  <div className="font-medium">
                    <span className="text-muted-foreground mr-2">From:</span>
                    {campaign.content?.from || "Unknown"}
                  </div>
                  <div>
                    <span className="text-muted-foreground mr-2">Subject:</span>
                    <span className="font-medium">
                      {campaign.content?.subject || "No Subject"}
                    </span>
                  </div>
                </div>

                {campaign.content?.html ? (
                  <iframe
                    srcDoc={campaign.content.html}
                    className="min-h-[600px] w-full flex-1 border-none bg-white"
                    title="Email Preview"
                  />
                ) : (
                  <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center p-12 text-center">
                    <Mail className="text-muted mb-4 h-12 w-12" />
                    <p>No HTML preview available.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground bg-muted/20 flex flex-col items-center justify-center rounded-xl py-20 text-center">
                <AlertCircle className="text-muted-foreground/50 mb-3 h-10 w-10" />
                <p>
                  Preview normally not supported for {campaign.channel} channel.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
