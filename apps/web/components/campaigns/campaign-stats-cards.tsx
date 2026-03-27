"use client";

import { Users, Send, XCircle, MousePointerClick } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CampaignStatsCardsProps {
  stats: {
    audienceSize: number;
    sentCount: number;
    failedCount: number;
    clickCount: number;
    uniqueClickCount: number;
  };
}

export function CampaignStatsCards({ stats }: CampaignStatsCardsProps) {
  const deliveryRate =
    stats.audienceSize > 0
      ? ((stats.sentCount / stats.audienceSize) * 100).toFixed(1)
      : "0";

  const clickRate =
    stats.sentCount > 0
      ? ((stats.uniqueClickCount / stats.sentCount) * 100).toFixed(1)
      : "0";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Audience Size</CardTitle>
          <Users className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.audienceSize.toLocaleString()}
          </div>
          <p className="text-muted-foreground text-xs">
            Total contacts targeted
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sent</CardTitle>
          <Send className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.sentCount.toLocaleString()}
          </div>
          <p className="text-muted-foreground text-xs">
            {deliveryRate}% delivery rate
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Failed</CardTitle>
          <XCircle className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.failedCount.toLocaleString()}
          </div>
          <p className="text-muted-foreground text-xs">
            {stats.audienceSize > 0
              ? ((stats.failedCount / stats.audienceSize) * 100).toFixed(1)
              : "0"}
            % failure rate
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Clicks</CardTitle>
          <MousePointerClick className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.uniqueClickCount.toLocaleString()}
          </div>
          <p className="text-muted-foreground text-xs">
            {clickRate}% click rate ({stats.clickCount} total)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
