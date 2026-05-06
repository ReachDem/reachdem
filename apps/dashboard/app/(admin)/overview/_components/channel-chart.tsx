"use client";

import {
  BarChart,
  Bar,
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

type Row = {
  month: string;
  free: number;
  starter: number;
  pro: number;
  enterprise: number;
};

function fmtXAF(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

export function MrrByPlanChart({ data }: { data: Row[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">MRR par plan</CardTitle>
        <CardDescription>
          6 derniers mois — Starter · Pro · Enterprise
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} barGap={2}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
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
              formatter={(v: number) => [`${fmtXAF(v)} FCFA`]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="free"
              name="Free"
              stackId="a"
              fill="var(--muted-foreground)"
              opacity={0.4}
            />
            <Bar
              dataKey="starter"
              name="Starter"
              stackId="a"
              fill="var(--chart-3)"
            />
            <Bar dataKey="pro" name="Pro" stackId="a" fill="var(--chart-2)" />
            <Bar
              dataKey="enterprise"
              name="Enterprise"
              stackId="a"
              fill="var(--chart-1)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
