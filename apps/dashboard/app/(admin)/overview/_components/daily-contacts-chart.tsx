"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { trend } from "@/lib/utils";
import { IconArrowUpRight, IconArrowDownRight } from "@tabler/icons-react";

type DailyData = {
  current: { day: string; value: number }[];
  previous: { day: string; value: number }[];
  totalCurrent: number; // avg daily active orgs this period
  totalPrevious: number; // avg daily active orgs previous period
};

export function DailyActiveOrgsChart({ data }: { data: DailyData }) {
  const { pct, up } = trend(data.totalCurrent, data.totalPrevious);

  const maxLen = Math.max(data.current.length, data.previous.length);
  const merged = Array.from({ length: maxLen }, (_, i) => ({
    idx: i + 1,
    current: data.current[i]?.value ?? 0,
    previous: data.previous[i]?.value ?? 0,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">
              Organisations actives / jour
            </CardTitle>
            <CardDescription>
              28 derniers jours vs période précédente
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{data.totalCurrent}</p>
            <div className="mt-0.5 flex items-center justify-end gap-1">
              {up ? (
                <IconArrowUpRight size={12} className="text-emerald-500" />
              ) : (
                <IconArrowDownRight size={12} className="text-rose-500" />
              )}
              <span
                className={`text-xs font-medium ${up ? "text-emerald-600" : "text-rose-600"}`}
              >
                {pct}% vs période préc.
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={merged}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="idx"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              interval={6}
              tickFormatter={(v) => `J${v}`}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="current"
              name="Ce mois"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="previous"
              name="Mois précédent"
              stroke="var(--chart-2)"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
