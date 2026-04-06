"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { VisitorPoint } from "@/lib/founder-admin/types";

interface VisitorsBarChartProps {
  data: VisitorPoint[];
  loading?: boolean;
  source?: string;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export function VisitorsBarChart({
  data,
  loading = false,
  source,
}: VisitorsBarChartProps) {
  if (loading) {
    return (
      <Card className="rounded-[26px] border border-white/6">
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-52" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((point) => ({
    date: formatDate(point.date),
    visitors: point.value,
  }));

  const totalVisitors = chartData.reduce(
    (sum, point) => sum + point.visitors,
    0
  );
  const peakDay =
    chartData.reduce<(typeof chartData)[number] | null>(
      (largest, point) =>
        largest == null || point.visitors > largest.visitors ? point : largest,
      null
    ) ?? null;

  return (
    <Card className="rounded-[26px] border border-white/6">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Daily Visitors</CardTitle>
        <CardDescription className="text-sm">
          Unique visitors over the last 10 days
          {source === "mock" ? (
            <span className="ml-1 text-amber-400">(sample data)</span>
          ) : null}
        </CardDescription>

        <div className="grid gap-3 pt-2 sm:grid-cols-2">
          <div
            data-founder-surface="tile"
            className="rounded-2xl px-3 py-3 text-sm"
          >
            <p className="text-[0.68rem] tracking-[0.2em] text-[color:var(--founder-quiet-foreground)] uppercase">
              Total
            </p>
            <p className="mt-2 text-xl font-semibold tabular-nums">
              {totalVisitors.toLocaleString()}
            </p>
          </div>
          <div
            data-founder-surface="tile"
            className="rounded-2xl px-3 py-3 text-sm"
          >
            <p className="text-[0.68rem] tracking-[0.2em] text-[color:var(--founder-quiet-foreground)] uppercase">
              Peak Day
            </p>
            <p className="mt-2 text-xl font-semibold">
              {peakDay ? peakDay.date : "No data"}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
          >
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "var(--color-muted)" }}
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value) => [
                Number(value ?? 0).toLocaleString(),
                "Visitors",
              ]}
            />
            <Bar
              dataKey="visitors"
              fill="var(--color-chart-1)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
