"use client";

import * as React from "react";
import {
  Area as RechartsArea,
  AreaChart as RechartsAreaChart,
  CartesianGrid as RechartsCartesianGrid,
  XAxis as RechartsXAxis,
} from "recharts";

import { ChartAreaSkeleton } from "@/components/skeletons/chart-area-skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export const description = "ReachDem messaging activity chart";

type ChartPoint = {
  date: string;
  sms: number;
  email: number;
};

const Area = RechartsArea as unknown as React.ComponentType<any>;
const AreaChart = RechartsAreaChart as unknown as React.ComponentType<any>;
const CartesianGrid =
  RechartsCartesianGrid as unknown as React.ComponentType<any>;
const XAxis = RechartsXAxis as unknown as React.ComponentType<any>;

const chartConfig = {
  messages: {
    label: "Messages",
  },
  sms: {
    label: "SMS",
    color: "hsl(142, 76%, 36%)", // Green for SMS
  },
  email: {
    label: "Email",
    color: "hsl(221, 83%, 53%)", // Blue for Email
  },
} satisfies ChartConfig;

export function ChartAreaInteractive() {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState("90d");
  const [chartData, setChartData] = React.useState<ChartPoint[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d");
    }
  }, [isMobile]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadChartData() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/v1/dashboard/chart", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          // Non-OK (e.g. no active workspace yet) — just show empty chart
          if (!cancelled) setChartData([]);
          return;
        }

        const payload = (await response.json()) as { data?: ChartPoint[] };
        if (!cancelled) {
          setChartData(Array.isArray(payload.data) ? payload.data : []);
        }
      } catch (error) {
        console.error(
          "[ChartAreaInteractive] Failed to load chart data:",
          error
        );
        if (!cancelled) {
          setChartData([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadChartData();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredData = React.useMemo(() => {
    if (chartData.length === 0) {
      return [];
    }

    const referenceDate = new Date(chartData[chartData.length - 1].date);
    let daysToSubtract = 90;
    if (timeRange === "30d") {
      daysToSubtract = 30;
    } else if (timeRange === "7d") {
      daysToSubtract = 7;
    }

    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - (daysToSubtract - 1));

    return chartData.filter((item) => new Date(item.date) >= startDate);
  }, [chartData, timeRange]);

  if (isLoading) {
    return <ChartAreaSkeleton />;
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Message Activity</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            SMS and Email activity from your real workspace data
          </span>
          <span className="@[540px]/card:hidden">Workspace activity</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillSms" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-sms)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-sms)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillEmail" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-email)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-email)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value: string) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(String(value)).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="email"
              type="natural"
              fill="url(#fillEmail)"
              stroke="var(--color-email)"
              stackId="a"
            />
            <Area
              dataKey="sms"
              type="natural"
              fill="url(#fillSms)"
              stroke="var(--color-sms)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
