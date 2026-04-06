import { type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | ReactNode;
  subtext?: string;
  trend?: { value: number; label: string };
  icon?: ReactNode;
  loading?: boolean;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

export function KpiCard({
  title,
  value,
  subtext,
  trend,
  icon,
  loading = false,
  badge,
  badgeVariant = "secondary",
}: KpiCardProps) {
  if (loading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-2 h-9 w-32" />
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <Skeleton className="h-3 w-40" />
        </CardFooter>
      </Card>
    );
  }

  const TrendIcon =
    trend && trend.value > 0
      ? TrendingUpIcon
      : trend && trend.value < 0
        ? TrendingDownIcon
        : MinusIcon;

  const trendColor =
    trend && trend.value > 0
      ? "text-emerald-400"
      : trend && trend.value < 0
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <Card className="@container/card rounded-[24px] border border-white/6">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardDescription className="text-[0.72rem] tracking-[0.22em] text-[color:var(--founder-quiet-foreground)] uppercase">
              {title}
            </CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {value}
            </CardTitle>
          </div>

          <CardAction className="col-auto row-auto">
            {badge || trend ? (
              <Badge
                variant={badgeVariant || "outline"}
                className="rounded-full border-white/10 bg-white/[0.04] px-2.5 py-1"
              >
                {trend ? (
                  <>
                    <TrendIcon className="mr-1 size-3" aria-hidden="true" />
                    {trend.value > 0 ? "+" : ""}
                    {trend.value}%
                  </>
                ) : (
                  badge
                )}
              </Badge>
            ) : icon ? (
              <div
                aria-hidden="true"
                className="flex size-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.05] text-[color:var(--founder-muted-foreground)]"
              >
                {icon}
              </div>
            ) : null}
          </CardAction>
        </div>

        {subtext ? (
          <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2 text-sm leading-6 text-[color:var(--founder-muted-foreground)]">
            {subtext}
          </div>
        ) : null}
      </CardHeader>

      {trend ? (
        <CardFooter className="items-center justify-between gap-3 px-4 py-3">
          <div
            className={cn("flex items-center gap-2 font-medium", trendColor)}
          >
            <TrendIcon className="size-4" aria-hidden="true" />
            <span>{trend.label}</span>
          </div>
          <span className="text-xs tracking-[0.18em] text-[color:var(--founder-quiet-foreground)] uppercase">
            Trend
          </span>
        </CardFooter>
      ) : null}
    </Card>
  );
}
