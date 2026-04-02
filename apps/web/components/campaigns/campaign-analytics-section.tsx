"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, Cell, Label, Pie, PieChart, XAxis } from "recharts";

interface DailyBucket {
  date: string;
  total: number;
  byLink?: Record<string, number>;
  byBrowser?: Record<string, number>;
  byDevice?: Record<string, number>;
}

interface VisitorsBucket {
  total: number;
  byRegion?: Record<string, number>;
  byCity?: Record<string, number>;
  byGender?: Record<string, number>;
}

interface LinkAnalyticsBucket {
  dailyVisits: DailyBucket[];
  visitors?: VisitorsBucket;
}

interface DeliverabilityBucket {
  attemptedCount: number;
  acceptedCount: number;
  deliveredCount: number;
  bouncedCount: number;
  openedCount: number;
  clickedCount: number;
  complainedCount: number;
  unsubscribedCount: number;
  resubscribedCount: number;
  totalOpenEvents: number;
  totalClickEvents: number;
}

interface AnalyticsData {
  dailyVisits: DailyBucket[];
  visitors: VisitorsBucket;
  links: Array<{ id: string; slug: string; shortUrl: string }>;
  linkAnalytics?: Record<string, LinkAnalyticsBucket>;
  deliverability?: DeliverabilityBucket;
}

interface CampaignAnalyticsSectionProps {
  data: AnalyticsData | null;
  isLoading?: boolean;
}

type BarSegment = "total" | "device" | "browser";
type PieSegment = "total" | "region" | "city" | "gender";

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function formatChartDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function normalizeRecord(
  source?: Record<string, number>,
  fallback = "Unknown"
): Record<string, number> {
  if (!source) return {};

  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [
      key?.trim() || fallback,
      Number(value || 0),
    ])
  );
}

function getLinkLabel(link: { slug: string; shortUrl: string }, index: number) {
  return `Link ${index + 1} : ${link.slug}`;
}

export function CampaignAnalyticsSection({
  data,
  isLoading = false,
}: CampaignAnalyticsSectionProps) {
  const [selectedLinkSlug, setSelectedLinkSlug] = useState("");
  const [barSegment, setBarSegment] = useState<BarSegment>("total");
  const [pieSegment, setPieSegment] = useState<PieSegment>("total");

  const effectiveLinkSlug = selectedLinkSlug || data?.links[0]?.slug || "";
  const hasMultipleLinks = (data?.links.length ?? 0) > 1;

  const selectedLinkIndex =
    data?.links.findIndex((link) => link.slug === effectiveLinkSlug) ?? -1;

  const selectedLinkAnalytics = useMemo(() => {
    if (!data || !effectiveLinkSlug) return null;
    return data.linkAnalytics?.[effectiveLinkSlug] ?? null;
  }, [data, effectiveLinkSlug]);

  const selectedDailyVisits =
    selectedLinkAnalytics?.dailyVisits ?? data?.dailyVisits ?? [];
  const selectedVisitors =
    selectedLinkAnalytics?.visitors ?? data?.visitors ?? null;

  const hasAnyAnalytics =
    !!data &&
    (data.dailyVisits.some((day) => Number(day.total || 0) > 0) ||
      Number(data.visitors.total || 0) > 0 ||
      Number(data.deliverability?.acceptedCount || 0) > 0 ||
      Number(data.deliverability?.deliveredCount || 0) > 0 ||
      Number(data.deliverability?.openedCount || 0) > 0 ||
      Number(data.deliverability?.clickedCount || 0) > 0 ||
      Number(data.deliverability?.bouncedCount || 0) > 0);

  const barChartData = useMemo(() => {
    if (barSegment === "total") {
      return selectedDailyVisits.map((day) => ({
        date: day.date,
        Visits: Number(day.total || 0),
      }));
    }

    return selectedDailyVisits.map((day) => {
      const source =
        barSegment === "browser"
          ? normalizeRecord(day.byBrowser, "Unknown browser")
          : normalizeRecord(day.byDevice, "Unknown device");

      const result: Record<string, string | number> = { date: day.date };
      for (const [key, value] of Object.entries(source)) {
        result[key] = value;
      }
      return result;
    });
  }, [barSegment, selectedDailyVisits]);

  const stackKeys = useMemo(() => {
    if (barSegment === "total") return ["Visits"];

    return Array.from(
      new Set(
        selectedDailyVisits.flatMap((day) => {
          const source =
            barSegment === "browser"
              ? normalizeRecord(day.byBrowser, "Unknown browser")
              : normalizeRecord(day.byDevice, "Unknown device");
          return Object.keys(source);
        })
      )
    );
  }, [barSegment, selectedDailyVisits]);

  const pieData = useMemo(() => {
    if (!selectedVisitors) return [];

    if (pieSegment === "total") {
      return [{ name: "Visitors", value: Number(selectedVisitors.total || 0) }];
    }

    const source =
      pieSegment === "region"
        ? normalizeRecord(selectedVisitors.byRegion, "Unknown region")
        : pieSegment === "city"
          ? normalizeRecord(selectedVisitors.byCity, "Unknown city")
          : normalizeRecord(selectedVisitors.byGender, "Unknown");

    return Object.entries(source)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [pieSegment, selectedVisitors]);

  const deliverabilityData = useMemo(() => {
    if (!data?.deliverability) return [];

    return [
      {
        stage: "Accepted",
        value: data.deliverability.acceptedCount || 0,
        base: data.deliverability.attemptedCount || 0,
        color: "hsl(var(--chart-1))",
      },
      {
        stage: "Delivered",
        value: data.deliverability.deliveredCount || 0,
        base: data.deliverability.acceptedCount || 0,
        color: "hsl(var(--chart-2))",
      },
      {
        stage: "Opened",
        value: data.deliverability.openedCount || 0,
        base: data.deliverability.deliveredCount || 0,
        color: "hsl(var(--chart-3))",
      },
      {
        stage: "Clicked",
        value: data.deliverability.clickedCount || 0,
        base: data.deliverability.openedCount || 0,
        color: "hsl(var(--chart-4))",
      },
    ].filter((item) => item.value > 0);
  }, [data]);

  const deliverabilityExceptions = useMemo(() => {
    if (!data?.deliverability) return [];

    return [
      {
        label: "Bounced",
        value: data.deliverability.bouncedCount || 0,
        color: "hsl(var(--destructive))",
      },
      {
        label: "Complaints",
        value: data.deliverability.complainedCount || 0,
        color: "hsl(var(--chart-5))",
      },
      {
        label: "Unsubscribed",
        value: data.deliverability.unsubscribedCount || 0,
        color: "hsl(var(--muted-foreground))",
      },
    ].filter((item) => item.value > 0);
  }, [data]);

  const hasBarSeriesData =
    stackKeys.length > 0 &&
    barChartData.some((day) =>
      stackKeys.some((key) => Number(day[key] ?? 0) > 0)
    );

  const hasPieData =
    pieSegment === "total"
      ? true
      : pieData.some((item) => Number(item.value || 0) > 0);

  const hasDeliverabilityData =
    deliverabilityData.length > 0 || deliverabilityExceptions.length > 0;

  const barChartConfig = Object.fromEntries(
    stackKeys.map((key, index) => [
      key,
      { label: key, color: COLORS[index % COLORS.length] },
    ])
  );

  const getBarDescription = () => {
    switch (barSegment) {
      case "total":
        return "Daily visit trends over the last 7 days.";
      case "device":
        return "Device breakdown stacked by day.";
      case "browser":
        return "Browser breakdown stacked by day.";
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

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {hasMultipleLinks ? (
          <div className="lg:col-span-3">
            <Skeleton className="h-9 w-[160px] animate-pulse" />
          </div>
        ) : null}

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-7 w-36 animate-pulse" />
                <Skeleton className="h-4 w-44 animate-pulse" />
              </div>
              <Skeleton className="h-9 w-[140px] animate-pulse" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-[300px] w-full animate-pulse" />
            <Skeleton className="mx-auto h-4 w-52 animate-pulse" />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-7 w-20 animate-pulse" />
              <Skeleton className="h-9 w-[120px] animate-pulse" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center">
              <Skeleton className="h-[250px] w-[250px] animate-pulse rounded-full" />
            </div>
            <Skeleton className="mx-auto h-4 w-44 animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasAnyAnalytics) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {hasMultipleLinks ? (
          <div className="lg:col-span-3">
            <Select
              value={effectiveLinkSlug}
              onValueChange={setSelectedLinkSlug}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Select link">
                  {selectedLinkIndex >= 0 && data
                    ? getLinkLabel(
                        data.links[selectedLinkIndex],
                        selectedLinkIndex
                      )
                    : "Select link"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {data?.links.map((link, index) => (
                  <SelectItem key={link.slug} value={link.slug}>
                    {getLinkLabel(link, index)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Visit Analytics</CardTitle>
            <CardDescription>Last 7 days including today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-border/70 bg-muted/20 flex h-[300px] items-end gap-4 rounded-xl border border-dashed px-6 py-8">
              {[32, 56, 44, 68, 40, 52, 36].map((height, index) => (
                <div
                  key={index}
                  className="bg-muted flex-1 rounded-t-md"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <p className="text-muted-foreground text-center text-sm">
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
            <p className="text-muted-foreground text-center text-sm">
              No data currently
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Deliverability</CardTitle>
            <CardDescription>Email Delivery Status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-border/70 bg-muted/20 mx-auto flex h-[250px] w-[250px] items-center justify-center rounded-full border border-dashed">
              <div className="text-muted-foreground text-sm font-medium">
                No data
              </div>
            </div>
            <p className="text-muted-foreground text-center text-sm">
              Deliverability statistics will appear here
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {hasMultipleLinks ? (
        <div className="lg:col-span-3">
          <Select value={effectiveLinkSlug} onValueChange={setSelectedLinkSlug}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select link">
                {selectedLinkIndex >= 0 && data
                  ? getLinkLabel(
                      data.links[selectedLinkIndex],
                      selectedLinkIndex
                    )
                  : "Select link"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {data?.links.map((link, index) => (
                <SelectItem key={link.slug} value={link.slug}>
                  {getLinkLabel(link, index)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Visit Analytics</CardTitle>
              <CardDescription>Last 7 days including today</CardDescription>
            </div>
            <Select
              value={barSegment}
              onValueChange={(value: BarSegment) => setBarSegment(value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total">Total</SelectItem>
                <SelectItem value="device">By device</SelectItem>
                <SelectItem value="browser">By browser</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasBarSeriesData ? (
            <ChartContainer
              config={barChartConfig}
              className="h-[300px] w-full"
            >
              <BarChart data={barChartData}>
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatChartDate}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                {barSegment !== "total" ? (
                  <ChartLegend content={<ChartLegendContent />} />
                ) : null}
                {stackKeys.map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId={barSegment === "total" ? undefined : "analytics"}
                    fill={COLORS[index % COLORS.length]}
                    radius={
                      barSegment === "total" || index === stackKeys.length - 1
                        ? [4, 4, 0, 0]
                        : [0, 0, 0, 0]
                    }
                  />
                ))}
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="border-border/70 bg-muted/10 text-muted-foreground flex h-[300px] items-center justify-center rounded-xl border border-dashed text-sm">
              No data currently for this filter
            </div>
          )}
          <p className="text-muted-foreground text-center text-sm">
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
              onValueChange={(value: PieSegment) => setPieSegment(value)}
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
          {hasPieData ? (
            <>
              <ChartContainer
                config={{}}
                className="mx-auto aspect-square h-[250px]"
              >
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
                        key={`${entry.name}-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                    {pieSegment === "total" ? (
                      <Label
                        content={({ viewBox }) => {
                          if (
                            !viewBox ||
                            !("cx" in viewBox) ||
                            !("cy" in viewBox)
                          ) {
                            return null;
                          }
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
                                {selectedVisitors?.total.toLocaleString() ??
                                  "0"}
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
                        }}
                      />
                    ) : null}
                  </Pie>
                </PieChart>
              </ChartContainer>

              {pieSegment !== "total" ? (
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                  {pieData.map((entry, index) => (
                    <div
                      key={`legend-${entry.name}-${index}`}
                      className="text-muted-foreground flex items-center gap-2 text-xs"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                      <span
                        className="max-w-[140px] truncate"
                        title={entry.name}
                      >
                        {entry.name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="border-border/70 bg-muted/10 text-muted-foreground flex h-[250px] items-center justify-center rounded-xl border border-dashed text-sm">
              No data currently for this filter
            </div>
          )}
          <p className="text-muted-foreground text-center text-xs">
            {getPieDescription()}
          </p>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Email Deliverability</CardTitle>
          <CardDescription>
            Funnel progression for accepted, delivered, opened, and clicked
            emails, with exceptions tracked separately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasDeliverabilityData ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
              <div className="space-y-4">
                <ChartContainer
                  config={Object.fromEntries(
                    deliverabilityData.map((entry) => [
                      entry.stage,
                      { label: entry.stage, color: entry.color },
                    ])
                  )}
                  className="h-[280px] w-full"
                >
                  <BarChart data={deliverabilityData}>
                    <XAxis
                      dataKey="stage"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {deliverabilityData.map((entry) => (
                        <Cell
                          key={`deliverability-${entry.stage}`}
                          fill={entry.color}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {deliverabilityData.map((entry) => {
                    const rate =
                      entry.base > 0
                        ? Math.round((entry.value / entry.base) * 100)
                        : 0;

                    return (
                      <div
                        key={`deliverability-summary-${entry.stage}`}
                        className="rounded-xl border p-4"
                      >
                        <div className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
                          {entry.stage}
                        </div>
                        <div className="mt-2 text-2xl font-semibold">
                          {entry.value.toLocaleString()}
                        </div>
                        <div className="text-muted-foreground mt-1 text-sm">
                          {rate}% of previous stage
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border p-4">
                  <div className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
                    Attempted
                  </div>
                  <div className="mt-2 text-3xl font-semibold">
                    {data?.deliverability?.attemptedCount?.toLocaleString() ??
                      "0"}
                  </div>
                  <p className="text-muted-foreground mt-2 text-sm">
                    Provider-accepted emails move through the funnel. Opens and
                    clicks are nested engagement events, not parallel outcomes.
                  </p>
                </div>

                <div className="rounded-xl border p-4">
                  <div className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
                    Exception signals
                  </div>
                  {deliverabilityExceptions.length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {deliverabilityExceptions.map((entry) => (
                        <div
                          key={`deliverability-exception-${entry.label}`}
                          className="flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-sm font-medium">
                              {entry.label}
                            </span>
                          </div>
                          <span className="text-muted-foreground text-sm">
                            {entry.value.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground mt-3 text-sm">
                      No bounce, complaint, or unsubscribe events captured yet.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border p-4">
                  <div className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
                    Engagement events
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="bg-muted/40 rounded-lg p-3">
                      <div className="text-muted-foreground text-xs">
                        Total opens
                      </div>
                      <div className="mt-1 text-xl font-semibold">
                        {data?.deliverability?.totalOpenEvents?.toLocaleString() ??
                          "0"}
                      </div>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-3">
                      <div className="text-muted-foreground text-xs">
                        Total clicks
                      </div>
                      <div className="mt-1 text-xl font-semibold">
                        {data?.deliverability?.totalClickEvents?.toLocaleString() ??
                          "0"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-border/70 bg-muted/10 text-muted-foreground flex h-[250px] items-center justify-center rounded-xl border border-dashed text-sm">
              No delivery data yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
