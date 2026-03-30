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
    </div>
  );
}
