"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Label,
} from "recharts";

interface AnalyticsData {
  dailyVisits: Array<{
    date: string;
    total: number;
    byLink?: Record<string, number>;
    byBrowser?: Record<string, number>;
    byDevice?: Record<string, number>;
  }>;
  visitors: {
    total: number;
    byRegion?: Record<string, number>;
    byCity?: Record<string, number>;
    byGender?: Record<string, number>;
  };
  links: Array<{ id: string; slug: string; shortUrl: string }>;
  linkAnalytics?: Record<
    string,
    {
      dailyVisits: Array<{
        date: string;
        total: number;
        byLink?: Record<string, number>;
        byBrowser?: Record<string, number>;
        byDevice?: Record<string, number>;
      }>;
    }
  >;
}

interface CampaignAnalyticsSectionProps {
  data: AnalyticsData | null;
}

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

export function CampaignAnalyticsSection({
  data,
}: CampaignAnalyticsSectionProps) {
  const [barSegment, setBarSegment] = useState<"total" | "browser" | "device">(
    "total"
  );
  const [selectedLinkSlug, setSelectedLinkSlug] = useState<string>("");
  const [pieSegment, setPieSegment] = useState<
    "total" | "region" | "city" | "gender"
  >("total");

  const hasAnalyticsData =
    !!data &&
    (data.visitors.total > 0 ||
      data.links.length > 0 ||
      data.dailyVisits.some((day) => {
        const hasSegments =
          Object.keys(day.byBrowser || {}).length > 0 ||
          Object.keys(day.byDevice || {}).length > 0;
        return day.total > 0 || hasSegments;
      }));

  const effectiveLinkSlug = selectedLinkSlug || data?.links[0]?.slug || "";

  if (!hasAnalyticsData) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Visit Analytics</CardTitle>
            <CardDescription>Last 7 days including today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-border/70 bg-muted/20 flex h-[300px] w-full items-end gap-4 rounded-xl border border-dashed px-6 py-8">
              {[32, 56, 44, 68, 40, 52, 36].map((height, index) => (
                <div
                  key={index}
                  className="bg-muted flex-1 rounded-t-md"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <p className="text-muted-foreground text-center text-sm leading-relaxed">
              No data currently
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Visitors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-border/70 bg-muted/20 mx-auto flex h-[250px] w-[250px] items-center justify-center rounded-full border border-dashed">
              <div className="border-border/70 bg-background/80 text-muted-foreground flex h-[120px] w-[120px] items-center justify-center rounded-full border border-dashed text-sm font-medium">
                0
              </div>
            </div>
            <p className="text-muted-foreground text-center text-xs leading-relaxed">
              No data currently
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  console.log(
    "Analytics render - barSegment:",
    barSegment,
    "selectedLinkSlug:",
    effectiveLinkSlug,
    "pieSegment:",
    pieSegment
  );

  const selectedLinkDailyVisits =
    data.linkAnalytics?.[effectiveLinkSlug]?.dailyVisits ?? data.dailyVisits;

  const barChartData = selectedLinkDailyVisits.map((day) => {
    if (barSegment === "total") {
      return { date: day.date, Visits: day.total };
    }

    const result: any = { date: day.date };
    const segmentData = barSegment === "browser" ? day.byBrowser : day.byDevice;

    if (segmentData) {
      Object.entries(segmentData).forEach(([key, value]) => {
        result[key] = value;
      });
    }

    return result;
  });

  // Collect all unique keys across all days for stacked bars
  const stackKeys =
    barSegment === "total"
      ? ["Visits"]
      : Array.from(
          new Set(
            selectedLinkDailyVisits.flatMap((day) => {
              const segmentData =
                barSegment === "browser" ? day.byBrowser : day.byDevice;
              return Object.keys(segmentData || {});
            })
          )
        );

  const getPieData = () => {
    if (pieSegment === "total") {
      return [{ name: "Visitors", value: data.visitors.total }];
    }

    const segmentData =
      pieSegment === "region"
        ? data.visitors.byRegion
        : pieSegment === "city"
          ? data.visitors.byCity
          : data.visitors.byGender;

    if (!segmentData) return [];

    return Object.entries(segmentData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  const pieData = getPieData();

  console.log("barChartData:", barChartData);
  console.log("stackKeys:", stackKeys);
  console.log("pieData:", pieData);

  const barChartConfig = stackKeys.reduce(
    (acc, key) => ({
      ...acc,
      [key]: { label: key },
    }),
    {}
  );

  const getBarDescription = () => {
    switch (barSegment) {
      case "total":
        return "Daily visit trends over the last 7 days.";
      case "browser":
        return "Browser breakdown of your audience.";
      case "device":
        return "Device type analysis (desktop vs mobile).";
      default:
        return "";
    }
  };

  const getPieDescription = () => {
    switch (pieSegment) {
      case "total":
        return "Total unique visitors who clicked your links.";
      case "region":
        return "Geographic distribution by region.";
      case "city":
        return "Visitor breakdown by city.";
      case "gender":
        return "Demographic segmentation by gender.";
      default:
        return "";
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Visit Analytics</CardTitle>
              <CardDescription>Last 7 days including today</CardDescription>
            </div>
            <div className="bg-muted/20 inline-flex items-center overflow-hidden rounded-lg border">
              <Select
                value={effectiveLinkSlug}
                onValueChange={setSelectedLinkSlug}
              >
                <SelectTrigger className="h-9 w-[130px] rounded-none border-0 bg-transparent shadow-none focus:ring-0">
                  <SelectValue placeholder="Link" />
                </SelectTrigger>
                <SelectContent>
                  {data.links.map((link) => (
                    <SelectItem key={link.slug} value={link.slug}>
                      {link.slug}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="bg-border h-6 w-px" />

              <Select
                value={barSegment}
                onValueChange={(value: "total" | "browser" | "device") =>
                  setBarSegment(value)
                }
              >
                <SelectTrigger className="h-9 w-[140px] rounded-none border-0 bg-transparent shadow-none focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">Total</SelectItem>
                  <SelectItem value="device">By device</SelectItem>
                  <SelectItem value="browser">By browser</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChartContainer config={barChartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                {barSegment !== "total" && (
                  <ChartLegend content={<ChartLegendContent />} />
                )}
                {stackKeys.map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="a"
                    fill={COLORS[index % COLORS.length]}
                    radius={
                      index === stackKeys.length - 1
                        ? [4, 4, 0, 0]
                        : [0, 0, 0, 0]
                    }
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
          <p className="text-muted-foreground text-center text-sm leading-relaxed">
            {getBarDescription()}
          </p>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Visitors</CardTitle>
            <Select
              value={pieSegment}
              onValueChange={(v: any) => setPieSegment(v)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total">Total</SelectItem>
                <SelectItem value="region">By Region</SelectItem>
                <SelectItem value="city">By City</SelectItem>
                <SelectItem value="gender">By Gender</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChartContainer
            config={{}}
            className="mx-auto aspect-square h-[250px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={pieSegment === "total" ? 60 : 50}
                  outerRadius={80}
                  strokeWidth={2}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                  {pieSegment === "total" && (
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-foreground text-3xl font-bold"
                              >
                                {data.visitors.total.toLocaleString()}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 24}
                                className="fill-muted-foreground text-sm"
                              >
                                Visitors
                              </tspan>
                            </text>
                          );
                        }
                      }}
                    />
                  )}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
          <p className="text-muted-foreground text-center text-xs leading-relaxed">
            {getPieDescription()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
