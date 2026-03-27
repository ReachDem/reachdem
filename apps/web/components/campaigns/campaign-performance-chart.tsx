"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

interface CampaignPerformanceChartProps {
  stats: {
    audienceSize: number;
    sentCount: number;
    failedCount: number;
    uniqueClickCount: number;
  };
}

export function CampaignPerformanceChart({
  stats,
}: CampaignPerformanceChartProps) {
  const data = [
    {
      name: "Audience",
      value: stats.audienceSize,
      fill: "hsl(var(--chart-1))",
    },
    {
      name: "Sent",
      value: stats.sentCount,
      fill: "hsl(var(--chart-2))",
    },
    {
      name: "Failed",
      value: stats.failedCount,
      fill: "hsl(var(--chart-3))",
    },
    {
      name: "Clicked",
      value: stats.uniqueClickCount,
      fill: "hsl(var(--chart-4))",
    },
  ];

  const chartConfig = {
    value: {
      label: "Count",
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
