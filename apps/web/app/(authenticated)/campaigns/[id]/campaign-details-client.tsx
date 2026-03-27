"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Pencil, RefreshCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import type { Campaign } from "@/actions/campaigns";
import {
  getCampaignStats,
  getCampaignLinks,
  getCampaignTargets,
} from "@/actions/campaigns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignStatsCards } from "@/components/campaigns/campaign-stats-cards";
import { CampaignPerformanceChart } from "@/components/campaigns/campaign-performance-chart";
import { TrackedLinksTable } from "@/components/campaigns/tracked-links-table";
import { CampaignTargetsTable } from "@/components/campaigns/campaign-targets-table";

interface CampaignDetailsClientProps {
  campaign: Campaign;
}

export function CampaignDetailsClient({
  campaign,
}: CampaignDetailsClientProps) {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
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
      const [statsData, linksData, targetsData] = await Promise.all([
        getCampaignStats(campaign.id).catch(() => null),
        getCampaignLinks(campaign.id).catch(() => []),
        getCampaignTargets(campaign.id, {
          page: targets.page,
          pageSize: targets.pageSize,
        }).catch(() => ({ targets: [], totalCount: 0, page: 1, pageSize: 50 })),
      ]);

      setStats(statsData);
      setLinks(linksData);
      setTargets(targetsData);

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
        return <Badge variant="outline">Draft</Badge>;
      case "running":
        return <Badge className="bg-emerald-500">Running</Badge>;
      case "partial":
        return (
          <Badge variant="secondary" className="bg-amber-500">
            Partial
          </Badge>
        );
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{campaign.status}</Badge>;
    }
  };

  const getChannelBadge = () => {
    switch (campaign.channel.toLowerCase()) {
      case "email":
        return (
          <Badge variant="secondary" className="bg-blue-50 text-blue-700">
            Email
          </Badge>
        );
      case "sms":
        return (
          <Badge variant="secondary" className="bg-amber-50 text-amber-700">
            SMS
          </Badge>
        );
      default:
        return <Badge variant="outline">{campaign.channel}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/campaigns">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight">
              {campaign.name}
            </h1>
          </div>
          {campaign.description && (
            <p className="text-muted-foreground ml-12">
              {campaign.description}
            </p>
          )}
          <div className="ml-12 flex items-center gap-2">
            {getChannelBadge()}
            {getStatusBadge()}
            <span className="text-muted-foreground text-sm">
              Updated{" "}
              {format(new Date(campaign.updatedAt), "MMM d, yyyy 'at' HH:mm")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
          {campaign.status === "draft" && (
            <Link href={`/campaigns/${campaign.id}/edit`}>
              <Button size="sm">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && <CampaignStatsCards stats={stats} />}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="links">
            Tracked Links ({links.length})
          </TabsTrigger>
          <TabsTrigger value="targets">
            Message Targets ({targets.totalCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {stats && <CampaignPerformanceChart stats={stats} />}
        </TabsContent>

        <TabsContent value="links">
          <TrackedLinksTable
            links={links}
            onRefresh={() => loadData(true)}
            isRefreshing={isRefreshing}
          />
        </TabsContent>

        <TabsContent value="targets">
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
      </Tabs>
    </div>
  );
}
