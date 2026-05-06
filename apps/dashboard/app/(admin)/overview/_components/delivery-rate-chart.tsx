"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
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

type ArpuData = {
  data: { day: string; arpu: number }[];
  avg: number;
  arpuCurrent: number;
  arpuPrevious: number;
};

function fmtXAF(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

export function ArpuChart({ data }: { data: ArpuData }) {
  const { pct, up } = trend(data.arpuCurrent, data.arpuPrevious);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">ARPU</CardTitle>
            <CardDescription>
              Revenu moyen par organisation — 28 jours
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              {fmtXAF(data.arpuCurrent)} FCFA
            </p>
            <div className="mt-0.5 flex items-center justify-end gap-1">
              {up ? (
                <IconArrowUpRight size={12} className="text-emerald-500" />
              ) : (
                <IconArrowDownRight size={12} className="text-rose-500" />
              )}
              <span
                className={`text-xs font-medium ${up ? "text-emerald-600" : "text-rose-600"}`}
              >
                {pct}% vs mois dernier
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              interval={6}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={fmtXAF}
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number) => [`${fmtXAF(v)} FCFA`, "ARPU"]}
            />
            <ReferenceLine
              y={data.avg}
              stroke="var(--chart-3)"
              strokeDasharray="4 2"
              label={{
                value: `Moy. ${fmtXAF(data.avg)}`,
                fontSize: 10,
                fill: "var(--muted-foreground)",
                position: "insideTopRight",
              }}
            />
            <Bar
              dataKey="arpu"
              name="ARPU"
              fill="var(--chart-1)"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
